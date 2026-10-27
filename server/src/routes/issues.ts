import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAuth, type AuthedRequest } from '../auth/middleware.js'
import { requireRole } from '../auth/requireRole.js'
import { logActivity } from '../lib/manuscripts.js'
import { param } from '../lib/params.js'

const router = Router()

router.post(
  '/:issueId/schedule',
  requireAuth,
  requireRole('admin', 'journal_manager', 'editor', 'production'),
  async (req: AuthedRequest, res) => {
    try {
      const issueId = param(req.params.issueId)
      const manuscriptId = String(req.body?.manuscriptId ?? '')
      const sortOrder = Number(req.body?.sortOrder ?? 0)
      if (!manuscriptId) {
        res.status(400).json({ ok: false, error: 'manuscriptId is required.' })
        return
      }
      const issue = await prisma.issue.findUnique({ where: { id: issueId } })
      if (!issue) {
        res.status(404).json({ ok: false, error: 'Issue not found.' })
        return
      }
      if (issue.status === 'published') {
        res.status(400).json({ ok: false, error: 'Cannot schedule into a published issue.' })
        return
      }

      const existing = await prisma.manuscript.findFirst({
        where: { OR: [{ id: manuscriptId }, { number: manuscriptId }] },
      })
      if (!existing) {
        res.status(404).json({ ok: false, error: 'Manuscript not found.' })
        return
      }

      const manuscript = await prisma.manuscript.update({
        where: { id: existing.id },
        data: {
          issueId: issue.id,
          issueSortOrder: sortOrder,
          volume: issue.volume,
          issue: issue.number,
        },
      })

      await logActivity({
        manuscriptId: existing.id,
        actorId: req.user!.id,
        label: 'Scheduled into issue',
        detail: `Vol. ${issue.volume} No. ${issue.number} (${issue.year})`,
      })

      res.json({ ok: true, manuscript })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to schedule article',
      })
    }
  },
)

router.post(
  '/:issueId/publish',
  requireAuth,
  requireRole('admin', 'journal_manager', 'production'),
  async (req: AuthedRequest, res) => {
    try {
      const issueId = param(req.params.issueId)
      const issue = await prisma.issue.findUnique({
        where: { id: issueId },
        include: { manuscripts: true },
      })
      if (!issue) {
        res.status(404).json({ ok: false, error: 'Issue not found.' })
        return
      }
      if (issue.manuscripts.length === 0) {
        res.status(400).json({ ok: false, error: 'Issue has no scheduled articles.' })
        return
      }

      const now = new Date()
      const journal = await prisma.journal.findUnique({
        where: { id: issue.journalId },
        select: { code: true },
      })
      const code = (journal?.code || 'article').toLowerCase()

      await prisma.$transaction([
        prisma.issue.update({
          where: { id: issue.id },
          data: { status: 'published', publishedAt: now },
        }),
        ...issue.manuscripts.map((m, index) =>
          prisma.manuscript.update({
            where: { id: m.id },
            data: {
              status: 'published',
              volume: issue.volume,
              issue: issue.number,
              doi:
                m.doi ||
                `10.0000/${code}.${issue.year}.${issue.volume}.${issue.number}.${String(index + 1).padStart(3, '0')}`,
            },
          }),
        ),
      ])

      for (const m of issue.manuscripts) {
        await logActivity({
          manuscriptId: m.id,
          actorId: req.user!.id,
          label: 'Published with issue',
          detail: `Vol. ${issue.volume} No. ${issue.number} (${issue.year})`,
        })
      }

      const updated = await prisma.issue.findUnique({
        where: { id: issue.id },
        include: {
          manuscripts: {
            select: { id: true, number: true, title: true, status: true, doi: true },
          },
        },
      })

      res.json({ ok: true, issue: updated })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to publish issue',
      })
    }
  },
)

export default router
