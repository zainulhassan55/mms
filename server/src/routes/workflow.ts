import { Router } from 'express'
import type { DiscussionAudience, GalleyFormat } from '@prisma/client'
import { prisma } from '../db.js'
import { requireAuth, type AuthedRequest } from '../auth/middleware.js'
import { requireRole } from '../auth/requireRole.js'
import { logActivity, manuscriptInclude, toClientManuscript } from '../lib/manuscripts.js'
import { param } from '../lib/params.js'
import { notifyCopyeditorAssigned } from '../lib/workflowEmails.js'

const router = Router()

async function findManuscript(key: string) {
  return prisma.manuscript.findFirst({
    where: { OR: [{ number: key }, { id: key }] },
  })
}

// --- Review rounds ---

router.get(
  '/:id/rounds',
  requireAuth,
  async (req: AuthedRequest, res) => {
    try {
      const ms = await findManuscript(param(req.params.id))
      if (!ms) {
        res.status(404).json({ ok: false, error: 'Manuscript not found.' })
        return
      }
      const rounds = await prisma.reviewRound.findMany({
        where: { manuscriptId: ms.id },
        include: {
          invitations: {
            include: {
              reviewer: { select: { id: true, name: true, email: true } },
              review: { select: { id: true, recommendation: true, submittedAt: true } },
            },
          },
          decisions: true,
          files: true,
        },
        orderBy: { roundNumber: 'asc' },
      })
      res.json({ ok: true, rounds })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to load rounds',
      })
    }
  },
)

router.post(
  '/:id/rounds',
  requireAuth,
  requireRole('editor', 'office', 'admin'),
  async (req: AuthedRequest, res) => {
    try {
      const ms = await findManuscript(param(req.params.id))
      if (!ms) {
        res.status(404).json({ ok: false, error: 'Manuscript not found.' })
        return
      }

      const open = await prisma.reviewRound.findFirst({
        where: { manuscriptId: ms.id, status: 'open' },
      })
      if (open) {
        await prisma.reviewRound.update({
          where: { id: open.id },
          data: { status: 'closed', closedAt: new Date(), closedById: req.user!.id },
        })
      }

      const latest = await prisma.reviewRound.findFirst({
        where: { manuscriptId: ms.id },
        orderBy: { roundNumber: 'desc' },
      })
      const round = await prisma.reviewRound.create({
        data: {
          manuscriptId: ms.id,
          roundNumber: (latest?.roundNumber ?? 0) + 1,
          status: 'open',
          notes: req.body?.notes ? String(req.body.notes) : null,
        },
      })

      await prisma.manuscript.update({
        where: { id: ms.id },
        data: { status: 'under_review', version: { increment: 0 } },
      })

      await logActivity({
        manuscriptId: ms.id,
        actorId: req.user!.id,
        label: 'Review round opened',
        detail: `Round ${round.roundNumber} opened.`,
      })

      res.status(201).json({ ok: true, round })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to open round',
      })
    }
  },
)

router.post(
  '/:id/rounds/:roundId/close',
  requireAuth,
  requireRole('editor', 'office', 'admin'),
  async (req: AuthedRequest, res) => {
    try {
      const round = await prisma.reviewRound.update({
        where: { id: param(req.params.roundId) },
        data: {
          status: 'closed',
          closedAt: new Date(),
          closedById: req.user!.id,
        },
      })
      await logActivity({
        manuscriptId: round.manuscriptId,
        actorId: req.user!.id,
        label: 'Review round closed',
        detail: `Round ${round.roundNumber} closed.`,
      })
      res.json({ ok: true, round })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to close round',
      })
    }
  },
)

// --- Copyediting ---

router.post(
  '/:id/copyedit/assign',
  requireAuth,
  requireRole('editor', 'office', 'admin', 'journal_manager'),
  async (req: AuthedRequest, res) => {
    try {
      const ms = await findManuscript(param(req.params.id))
      if (!ms) {
        res.status(404).json({ ok: false, error: 'Manuscript not found.' })
        return
      }
      if (!['accepted', 'copyediting'].includes(ms.status)) {
        res.status(400).json({
          ok: false,
          error: 'Copyediting starts after acceptance.',
        })
        return
      }
      const copyeditorId = String(req.body?.copyeditorId ?? '').trim()
      if (!copyeditorId) {
        res.status(400).json({ ok: false, error: 'copyeditorId is required.' })
        return
      }

      const copyeditor = await prisma.user.findUnique({
        where: { id: copyeditorId },
        select: { id: true, name: true, email: true },
      })
      if (!copyeditor) {
        res.status(400).json({ ok: false, error: 'Copyeditor not found.' })
        return
      }

      const assignment = await prisma.copyeditAssignment.create({
        data: {
          manuscriptId: ms.id,
          copyeditorId,
          assignedById: req.user!.id,
          status: 'assigned',
          notes: req.body?.notes ? String(req.body.notes) : null,
        },
      })

      const manuscript = await prisma.manuscript.update({
        where: { id: ms.id },
        data: { status: 'copyediting' },
        include: manuscriptInclude,
      })

      await logActivity({
        manuscriptId: ms.id,
        actorId: req.user!.id,
        label: 'Copyeditor assigned',
        detail: `Copyediting started.`,
      })

      notifyCopyeditorAssigned({
        copyeditorEmail: copyeditor.email,
        copyeditorName: copyeditor.name,
        number: manuscript.number,
        title: manuscript.title,
        journalName: manuscript.journal?.name,
      })

      res.json({ ok: true, assignment, manuscript: toClientManuscript(manuscript) })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to assign copyeditor',
      })
    }
  },
)

router.patch(
  '/:id/copyedit/:assignmentId',
  requireAuth,
  requireRole('copyeditor', 'editor', 'office', 'admin', 'journal_manager'),
  async (req: AuthedRequest, res) => {
    try {
      const status = String(req.body?.status ?? '')
      const allowed = ['assigned', 'in_progress', 'author_query', 'approved']
      if (!allowed.includes(status)) {
        res.status(400).json({ ok: false, error: 'Invalid copyedit status.' })
        return
      }

      const assignment = await prisma.copyeditAssignment.update({
        where: { id: param(req.params.assignmentId) },
        data: {
          status: status as 'assigned' | 'in_progress' | 'author_query' | 'approved',
          authorQueries: req.body?.authorQueries
            ? String(req.body.authorQueries)
            : undefined,
          notes: req.body?.notes ? String(req.body.notes) : undefined,
          cleanFileName: req.body?.cleanFileName
            ? String(req.body.cleanFileName)
            : undefined,
          completedAt: status === 'approved' ? new Date() : undefined,
        },
      })

      if (status === 'approved') {
        await logActivity({
          manuscriptId: assignment.manuscriptId,
          actorId: req.user!.id,
          label: 'Copyediting approved',
          detail: 'Clean file approved; ready for production.',
        })
      }

      res.json({ ok: true, assignment })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to update copyedit',
      })
    }
  },
)

router.get(
  '/:id/copyedit',
  requireAuth,
  async (req: AuthedRequest, res) => {
    try {
      const ms = await findManuscript(param(req.params.id))
      if (!ms) {
        res.status(404).json({ ok: false, error: 'Manuscript not found.' })
        return
      }
      const assignments = await prisma.copyeditAssignment.findMany({
        where: { manuscriptId: ms.id },
        include: {
          copyeditor: { select: { id: true, name: true, email: true } },
        },
        orderBy: { assignedAt: 'desc' },
      })
      res.json({ ok: true, assignments })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to load copyedits',
      })
    }
  },
)

// --- Galleys ---

router.post(
  '/:id/galleys',
  requireAuth,
  requireRole('production', 'admin', 'journal_manager', 'editor'),
  async (req: AuthedRequest, res) => {
    try {
      const ms = await findManuscript(param(req.params.id))
      if (!ms) {
        res.status(404).json({ ok: false, error: 'Manuscript not found.' })
        return
      }
      const label = String(req.body?.label ?? 'PDF').trim()
      const format = String(req.body?.format ?? 'pdf') as GalleyFormat
      const fileName = String(req.body?.fileName ?? '').trim()
      if (!fileName) {
        res.status(400).json({ ok: false, error: 'fileName is required.' })
        return
      }
      const isPrimary = Boolean(req.body?.isPrimary)
      if (isPrimary) {
        await prisma.galley.updateMany({
          where: { manuscriptId: ms.id },
          data: { isPrimary: false },
        })
      }
      const galley = await prisma.galley.create({
        data: {
          manuscriptId: ms.id,
          issueId: ms.issueId,
          label,
          format,
          fileName,
          storagePath: req.body?.storagePath ? String(req.body.storagePath) : null,
          mimeType: req.body?.mimeType ? String(req.body.mimeType) : null,
          sizeBytes: req.body?.sizeBytes ? Number(req.body.sizeBytes) : null,
          isPrimary: isPrimary || format === 'pdf',
        },
      })
      await logActivity({
        manuscriptId: ms.id,
        actorId: req.user!.id,
        label: 'Galley uploaded',
        detail: `${label} (${format})`,
      })
      res.status(201).json({ ok: true, galley })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to create galley',
      })
    }
  },
)

router.get(
  '/:id/galleys',
  requireAuth,
  async (req: AuthedRequest, res) => {
    try {
      const ms = await findManuscript(param(req.params.id))
      if (!ms) {
        res.status(404).json({ ok: false, error: 'Manuscript not found.' })
        return
      }
      const galleys = await prisma.galley.findMany({
        where: { manuscriptId: ms.id },
        orderBy: { uploadedAt: 'desc' },
      })
      res.json({ ok: true, galleys })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to load galleys',
      })
    }
  },
)

// --- Discussions ---

router.get(
  '/:id/discussions',
  requireAuth,
  async (req: AuthedRequest, res) => {
    try {
      const ms = await findManuscript(param(req.params.id))
      if (!ms) {
        res.status(404).json({ ok: false, error: 'Manuscript not found.' })
        return
      }
      const threads = await prisma.discussionThread.findMany({
        where: { manuscriptId: ms.id },
        include: {
          posts: {
            include: {
              author: { select: { id: true, name: true, role: true } },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { updatedAt: 'desc' },
      })
      res.json({ ok: true, threads })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to load discussions',
      })
    }
  },
)

router.post(
  '/:id/discussions',
  requireAuth,
  async (req: AuthedRequest, res) => {
    try {
      const ms = await findManuscript(param(req.params.id))
      if (!ms) {
        res.status(404).json({ ok: false, error: 'Manuscript not found.' })
        return
      }
      const subject = String(req.body?.subject ?? '').trim()
      const body = String(req.body?.body ?? '').trim()
      const audience = String(req.body?.audience ?? 'editorial') as DiscussionAudience
      if (!subject || !body) {
        res.status(400).json({ ok: false, error: 'subject and body are required.' })
        return
      }
      const thread = await prisma.discussionThread.create({
        data: {
          manuscriptId: ms.id,
          subject,
          audience,
          posts: {
            create: {
              authorId: req.user!.id,
              body,
            },
          },
        },
        include: {
          posts: {
            include: {
              author: { select: { id: true, name: true, role: true } },
            },
          },
        },
      })
      res.status(201).json({ ok: true, thread })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to create discussion',
      })
    }
  },
)

router.post(
  '/:id/discussions/:threadId/posts',
  requireAuth,
  async (req: AuthedRequest, res) => {
    try {
      const body = String(req.body?.body ?? '').trim()
      if (!body) {
        res.status(400).json({ ok: false, error: 'body is required.' })
        return
      }
      const post = await prisma.discussionPost.create({
        data: {
          threadId: param(req.params.threadId),
          authorId: req.user!.id,
          body,
        },
        include: {
          author: { select: { id: true, name: true, role: true } },
        },
      })
      await prisma.discussionThread.update({
        where: { id: param(req.params.threadId) },
        data: { updatedAt: new Date() },
      })
      res.status(201).json({ ok: true, post })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to post reply',
      })
    }
  },
)

// --- DOI deposit ---

router.post(
  '/:id/doi-deposit',
  requireAuth,
  requireRole('production', 'admin', 'journal_manager'),
  async (req: AuthedRequest, res) => {
    try {
      const ms = await findManuscript(param(req.params.id))
      if (!ms) {
        res.status(404).json({ ok: false, error: 'Manuscript not found.' })
        return
      }
      const doi = String(req.body?.doi ?? ms.doi ?? '').trim()
      if (!doi) {
        res.status(400).json({ ok: false, error: 'DOI is required.' })
        return
      }

      const journal = await prisma.journal.findUnique({ where: { id: ms.journalId } })
      const payload = {
        doi,
        title: ms.title,
        journal: journal?.name,
        authors: ms.authorsText,
        volume: ms.volume,
        issue: ms.issue,
      }

      const deposit = await prisma.doiDeposit.create({
        data: {
          manuscriptId: ms.id,
          doi,
          provider: 'crossref',
          status: 'queued',
          payloadPreview: JSON.stringify(payload, null, 2),
          submittedAt: new Date(),
          responseDetail:
            'Queued for Crossref deposit. Configure CROSSREF_DEPOSIT_URL to enable live deposit.',
        },
      })

      if (!ms.doi) {
        await prisma.manuscript.update({
          where: { id: ms.id },
          data: { doi },
        })
      }

      // Optional live deposit when configured
      const endpoint = process.env.CROSSREF_DEPOSIT_URL
      if (endpoint) {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(process.env.CROSSREF_API_TOKEN
                ? { Authorization: `Bearer ${process.env.CROSSREF_API_TOKEN}` }
                : {}),
            },
            body: JSON.stringify(payload),
          })
          const text = await response.text()
          await prisma.doiDeposit.update({
            where: { id: deposit.id },
            data: {
              status: response.ok ? 'submitted' : 'failed',
              responseDetail: text.slice(0, 2000),
              registeredAt: response.ok ? new Date() : null,
            },
          })
        } catch (err) {
          await prisma.doiDeposit.update({
            where: { id: deposit.id },
            data: {
              status: 'failed',
              responseDetail: err instanceof Error ? err.message : 'Deposit failed',
            },
          })
        }
      }

      await logActivity({
        manuscriptId: ms.id,
        actorId: req.user!.id,
        label: 'DOI deposit queued',
        detail: doi,
      })

      const updated = await prisma.doiDeposit.findUnique({ where: { id: deposit.id } })
      res.json({ ok: true, deposit: updated })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to queue DOI deposit',
      })
    }
  },
)

router.get(
  '/:id/doi-deposits',
  requireAuth,
  async (req: AuthedRequest, res) => {
    try {
      const ms = await findManuscript(param(req.params.id))
      if (!ms) {
        res.status(404).json({ ok: false, error: 'Manuscript not found.' })
        return
      }
      const deposits = await prisma.doiDeposit.findMany({
        where: { manuscriptId: ms.id },
        orderBy: { createdAt: 'desc' },
      })
      res.json({ ok: true, deposits })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to load deposits',
      })
    }
  },
)

export default router
