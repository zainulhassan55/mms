import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAuth, type AuthedRequest } from '../auth/middleware.js'
import { requireRole } from '../auth/requireRole.js'
import { toClientActivity, toClientManuscript } from '../lib/manuscripts.js'
import { manuscriptInclude } from '../lib/manuscripts.js'

const router = Router()

const PORTAL_SYNC_ENDPOINT = 'POST /api/portal/articles'

router.get(
  '/analytics',
  requireAuth,
  requireRole('admin'),
  async (_req: AuthedRequest, res) => {
    try {
      const [
        manuscripts,
        journals,
        pendingInvites,
        completedReviews,
        portalSyncs,
        recentActivity,
      ] = await Promise.all([
        prisma.manuscript.findMany({
          select: {
            status: true,
            journal: { select: { id: true, name: true, code: true } },
          },
        }),
        prisma.journal.findMany({ orderBy: { name: 'asc' } }),
        prisma.reviewInvitation.count({ where: { status: 'sent' } }),
        prisma.reviewReport.count(),
        prisma.manuscript.count({
          where: { status: 'published', portalSyncStatus: 'synced' },
        }),
        prisma.activityEvent.findMany({
          include: { manuscript: { select: { number: true } } },
          orderBy: { createdAt: 'desc' },
          take: 8,
        }),
      ])

      const total = manuscripts.length
      const submitted = manuscripts.filter((m) => m.status !== 'draft').length
      const underReview = manuscripts.filter((m) =>
        ['under_review', 'revision_requested'].includes(m.status),
      ).length
      const accepted = manuscripts.filter((m) =>
        [
          'accepted',
          'in_production',
          'proof_sent',
          'ready_for_publication',
          'published',
        ].includes(m.status),
      ).length
      const rejected = manuscripts.filter((m) => m.status === 'rejected').length
      const published = manuscripts.filter((m) => m.status === 'published').length
      const decided = accepted + rejected
      const acceptanceRate = decided
        ? Math.round((accepted / decided) * 100)
        : 0

      const byJournal = journals.map((journal) => ({
        id: journal.id,
        code: journal.code,
        name: journal.name,
        count: manuscripts.filter((m) => m.journal.id === journal.id).length,
        published: manuscripts.filter(
          (m) => m.journal.id === journal.id && m.status === 'published',
        ).length,
      }))

      res.json({
        ok: true,
        analytics: {
          total,
          submitted,
          underReview,
          accepted,
          rejected,
          published,
          acceptanceRate,
          pendingInvites,
          completedReviews,
          portalSyncs,
          byJournal,
          recentActivity: recentActivity.map(toClientActivity),
        },
      })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error:
          error instanceof Error ? error.message : 'Failed to load analytics',
      })
    }
  },
)

router.get(
  '/portal-sync',
  requireAuth,
  requireRole('admin', 'production'),
  async (_req: AuthedRequest, res) => {
    try {
      const [published, syncActivities] = await Promise.all([
        prisma.manuscript.findMany({
          where: { status: 'published' },
          include: manuscriptInclude,
          orderBy: { updatedAt: 'desc' },
        }),
        prisma.activityEvent.findMany({
          where: {
            OR: [
              { label: 'Article published' },
              { label: 'Portal re-sync' },
            ],
          },
          include: {
            manuscript: {
              select: {
                number: true,
                title: true,
                doi: true,
                journal: { select: { name: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        }),
      ])

      res.json({
        ok: true,
        endpoint: PORTAL_SYNC_ENDPOINT,
        published: published.map(toClientManuscript),
        syncLog: syncActivities.map((item) => ({
          id: item.id,
          manuscriptId: item.manuscript?.number ?? item.manuscriptId ?? '',
          title: item.manuscript?.title ?? 'Manuscript',
          doi: item.manuscript?.doi ?? '',
          journal: item.manuscript?.journal.name ?? '',
          status: 'synced' as const,
          endpoint: PORTAL_SYNC_ENDPOINT,
          detail: item.detail,
          at: item.createdAt.toISOString().slice(0, 10),
          payloadPreview: JSON.stringify(
            {
              manuscriptId: item.manuscript?.number,
              doi: item.manuscript?.doi,
              title: item.manuscript?.title,
              journal: item.manuscript?.journal.name,
            },
            null,
            0,
          ),
        })),
      })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error:
          error instanceof Error ? error.message : 'Failed to load portal sync',
      })
    }
  },
)

router.get(
  '/directory',
  requireAuth,
  requireRole('admin', 'office'),
  async (_req: AuthedRequest, res) => {
    try {
      const [journals, editors, reviewers] = await Promise.all([
        prisma.journal.findMany({ orderBy: { name: 'asc' } }),
        prisma.user.findMany({
          where: { role: 'editor' },
          select: {
            id: true,
            name: true,
            email: true,
            affiliation: true,
          },
          orderBy: { name: 'asc' },
        }),
        prisma.user.findMany({
          where: { role: 'reviewer' },
          select: {
            id: true,
            name: true,
            email: true,
            affiliation: true,
            expertise: true,
          },
          orderBy: { name: 'asc' },
        }),
      ])

      res.json({ ok: true, journals, editors, reviewers })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error:
          error instanceof Error ? error.message : 'Failed to load directory',
      })
    }
  },
)

export default router
