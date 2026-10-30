import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAuth, type AuthedRequest } from '../auth/middleware.js'
import { requireRole } from '../auth/requireRole.js'
import {
  createJournalWithDefaults,
  normalizeJournalCode,
} from '../lib/createJournal.js'
import { param } from '../lib/params.js'
import {
  notifyJournalRequestDecision,
  notifyJournalRequestSubmitted,
} from '../lib/workflowEmails.js'

const router = Router()

function toClientRequest(row: {
  id: string
  proposedCode: string
  proposedName: string
  issn: string | null
  description: string | null
  contactEmail: string | null
  status: string
  adminNote: string | null
  reviewedAt: Date | null
  createdAt: Date
  journalId: string | null
  requester?: { id: string; name: string; email: string }
  journal?: { id: string; code: string; name: string } | null
}) {
  return {
    id: row.id,
    proposedCode: row.proposedCode,
    proposedName: row.proposedName,
    issn: row.issn,
    description: row.description,
    contactEmail: row.contactEmail,
    status: row.status,
    adminNote: row.adminNote,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    journalId: row.journalId,
    requester: row.requester
      ? {
          id: row.requester.id,
          name: row.requester.name,
          email: row.requester.email,
        }
      : undefined,
    journal: row.journal
      ? {
          id: row.journal.id,
          code: row.journal.code,
          name: row.journal.name,
        }
      : null,
  }
}

/** Authenticated user requests a journal workspace. */
router.post('/', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const proposedCode = normalizeJournalCode(String(req.body?.proposedCode ?? ''))
    const proposedName = String(req.body?.proposedName ?? '').trim()
    const issn = String(req.body?.issn ?? '').trim() || null
    const description = String(req.body?.description ?? '').trim() || null
    const contactEmail = String(req.body?.contactEmail ?? '').trim() || null

    if (!proposedCode || proposedCode.length < 2) {
      res.status(400).json({
        ok: false,
        error: 'Suggested journal code is required (e.g. ijdh).',
      })
      return
    }
    if (!proposedName || proposedName.length < 3) {
      res.status(400).json({ ok: false, error: 'Journal name is required.' })
      return
    }

    const taken = await prisma.journal.findFirst({
      where: {
        OR: [{ code: proposedCode }, { name: proposedName }],
      },
    })
    if (taken) {
      res.status(409).json({
        ok: false,
        error: 'That journal code or name is already in use. Choose another.',
      })
      return
    }

    const pendingSame = await prisma.journalRequest.findFirst({
      where: {
        status: 'pending',
        OR: [{ proposedCode }, { proposedName }],
      },
    })
    if (pendingSame) {
      res.status(409).json({
        ok: false,
        error: 'A pending request already uses that code or name.',
      })
      return
    }

    const created = await prisma.journalRequest.create({
      data: {
        requesterId: req.user!.id,
        proposedCode,
        proposedName,
        issn,
        description,
        contactEmail,
      },
      include: {
        requester: { select: { id: true, name: true, email: true } },
      },
    })

    notifyJournalRequestSubmitted({
      requestId: created.id,
      proposedName: created.proposedName,
      proposedCode: created.proposedCode,
      requesterName: created.requester.name,
      requesterEmail: created.requester.email,
    })

    res.status(201).json({ ok: true, request: toClientRequest(created) })
  } catch (error) {
    res.status(500).json({
      ok: false,
      error:
        error instanceof Error ? error.message : 'Failed to submit journal request',
    })
  }
})

/** Current user's requests. */
router.get('/mine', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const rows = await prisma.journalRequest.findMany({
      where: { requesterId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      include: {
        journal: { select: { id: true, code: true, name: true } },
      },
    })
    res.json({ ok: true, requests: rows.map(toClientRequest) })
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to load requests',
    })
  }
})

/** Site admin: all requests (optional ?status=pending). */
router.get(
  '/',
  requireAuth,
  requireRole('admin'),
  async (req: AuthedRequest, res) => {
    try {
      const status = String(req.query.status ?? '').trim()
      const rows = await prisma.journalRequest.findMany({
        where:
          status === 'pending' ||
          status === 'approved' ||
          status === 'rejected'
            ? { status }
            : undefined,
        orderBy: { createdAt: 'desc' },
        include: {
          requester: { select: { id: true, name: true, email: true } },
          journal: { select: { id: true, code: true, name: true } },
        },
      })
      res.json({ ok: true, requests: rows.map(toClientRequest) })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to load requests',
      })
    }
  },
)

router.post(
  '/:id/approve',
  requireAuth,
  requireRole('admin'),
  async (req: AuthedRequest, res) => {
    try {
      const id = param(req.params.id)
      const existing = await prisma.journalRequest.findUnique({
        where: { id },
        include: {
          requester: { select: { id: true, name: true, email: true } },
        },
      })
      if (!existing) {
        res.status(404).json({ ok: false, error: 'Request not found.' })
        return
      }
      if (existing.status !== 'pending') {
        res.status(400).json({
          ok: false,
          error: 'Only pending requests can be approved.',
        })
        return
      }

      const journal = await createJournalWithDefaults({
        code: existing.proposedCode,
        name: existing.proposedName,
        issn: existing.issn,
        description: existing.description,
        contactEmail: existing.contactEmail,
        managerUserId: existing.requesterId,
      })

      const requesterUser = await prisma.user.findUnique({
        where: { id: existing.requesterId },
        select: { role: true },
      })
      if (
        requesterUser &&
        !['admin', 'journal_manager'].includes(requesterUser.role)
      ) {
        await prisma.user.update({
          where: { id: existing.requesterId },
          data: { role: 'journal_manager' },
        })
      }

      const updated = await prisma.journalRequest.update({
        where: { id },
        data: {
          status: 'approved',
          journalId: journal.id,
          reviewedById: req.user!.id,
          reviewedAt: new Date(),
          adminNote: String(req.body?.adminNote ?? '').trim() || null,
        },
        include: {
          requester: { select: { id: true, name: true, email: true } },
          journal: { select: { id: true, code: true, name: true } },
        },
      })

      notifyJournalRequestDecision({
        email: updated.requester.email,
        name: updated.requester.name,
        approved: true,
        journalName: journal.name,
        journalCode: journal.code,
        adminNote: updated.adminNote,
      })

      res.json({
        ok: true,
        request: toClientRequest(updated),
        journal,
      })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error:
          error instanceof Error ? error.message : 'Failed to approve request',
      })
    }
  },
)

router.post(
  '/:id/reject',
  requireAuth,
  requireRole('admin'),
  async (req: AuthedRequest, res) => {
    try {
      const id = param(req.params.id)
      const note = String(req.body?.adminNote ?? '').trim()
      const existing = await prisma.journalRequest.findUnique({
        where: { id },
        include: {
          requester: { select: { id: true, name: true, email: true } },
        },
      })
      if (!existing) {
        res.status(404).json({ ok: false, error: 'Request not found.' })
        return
      }
      if (existing.status !== 'pending') {
        res.status(400).json({
          ok: false,
          error: 'Only pending requests can be rejected.',
        })
        return
      }

      const updated = await prisma.journalRequest.update({
        where: { id },
        data: {
          status: 'rejected',
          reviewedById: req.user!.id,
          reviewedAt: new Date(),
          adminNote: note || null,
        },
        include: {
          requester: { select: { id: true, name: true, email: true } },
          journal: { select: { id: true, code: true, name: true } },
        },
      })

      notifyJournalRequestDecision({
        email: updated.requester.email,
        name: updated.requester.name,
        approved: false,
        journalName: existing.proposedName,
        journalCode: existing.proposedCode,
        adminNote: updated.adminNote,
      })

      res.json({ ok: true, request: toClientRequest(updated) })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error:
          error instanceof Error ? error.message : 'Failed to reject request',
      })
    }
  },
)

export default router
