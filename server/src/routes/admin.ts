import { Router } from 'express'
import type { AppRole } from '@prisma/client'
import { prisma } from '../db.js'
import { requireAuth, type AuthedRequest } from '../auth/middleware.js'
import { requireRole } from '../auth/requireRole.js'
import { toClientActivity, toClientManuscript } from '../lib/manuscripts.js'
import { manuscriptInclude } from '../lib/manuscripts.js'
import { runDeadlineReminders } from '../lib/reminders.js'
import { roleLabels } from '../lib/labels.js'
import { ensureMembership } from '../lib/journalAccess.js'
import { param } from '../lib/params.js'
import { hashPassword } from '../auth/password.js'
import { notifyAccountWelcome } from '../lib/workflowEmails.js'

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '??'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

const router = Router()

const PORTAL_SYNC_ENDPOINT = 'POST /api/portal/articles'

router.get(
  '/analytics',
  requireAuth,
  requireRole('admin'),
  async (_req: AuthedRequest, res) => {
    try {
      // Platform metrics only — site admin must not see journal papers/records.
      const [journals, users, pendingRequests, approvedRequests] =
        await Promise.all([
          prisma.journal.findMany({
            orderBy: { name: 'asc' },
            select: { id: true, code: true, name: true, active: true },
          }),
          prisma.user.count(),
          prisma.journalRequest.count({ where: { status: 'pending' } }),
          prisma.journalRequest.count({ where: { status: 'approved' } }),
        ])

      res.json({
        ok: true,
        analytics: {
          total: 0,
          submitted: 0,
          underReview: 0,
          accepted: 0,
          rejected: 0,
          published: 0,
          acceptanceRate: 0,
          pendingInvites: 0,
          completedReviews: 0,
          portalSyncs: 0,
          platformUsers: users,
          pendingJournalRequests: pendingRequests,
          approvedJournalRequests: approvedRequests,
          byJournal: journals.map((journal) => ({
            id: journal.id,
            code: journal.code,
            name: journal.name,
            active: journal.active,
            count: null,
            published: null,
          })),
          recentActivity: [],
          isolationNote:
            'Site admin cannot access journal manuscripts, reviews, or author records. Those belong to each journal’s staff.',
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
  async (req: AuthedRequest, res) => {
    try {
      // Site admin: no manuscript tenancy access.
      if (req.user!.role === 'admin') {
        res.json({ ok: true, published: [], activities: [] })
        return
      }

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

router.post(
  '/reminders/run',
  requireAuth,
  requireRole('admin', 'office'),
  async (_req: AuthedRequest, res) => {
    try {
      const result = await runDeadlineReminders()
      res.json({ ok: true, result })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error:
          error instanceof Error ? error.message : 'Failed to run reminders',
      })
    }
  },
)

/** Site-wide users (OJS Site Admin → Users). */
router.post(
  '/users',
  requireAuth,
  requireRole('admin'),
  async (req: AuthedRequest, res) => {
    try {
      const name = String(req.body?.name ?? '').trim()
      const email = String(req.body?.email ?? '')
        .trim()
        .toLowerCase()
      const password = String(req.body?.password ?? '')
      const role = String(req.body?.role ?? 'author').trim() as AppRole
      const affiliation = String(req.body?.affiliation ?? '').trim() || null
      const expertise = String(req.body?.expertise ?? '').trim() || null
      const allowed: AppRole[] = [
        'author',
        'editor',
        'reviewer',
        'production',
        'copyeditor',
        'journal_manager',
        'admin',
      ]
      if (!name || name.length < 2) {
        res.status(400).json({ ok: false, error: 'Name is required.' })
        return
      }
      if (!email.includes('@')) {
        res.status(400).json({ ok: false, error: 'Valid email is required.' })
        return
      }
      if (password.length < 6) {
        res.status(400).json({
          ok: false,
          error: 'Password must be at least 6 characters.',
        })
        return
      }
      if (!allowed.includes(role)) {
        res.status(400).json({ ok: false, error: 'Invalid role.' })
        return
      }

      const existing = await prisma.user.findUnique({ where: { email } })
      if (existing) {
        res.status(409).json({
          ok: false,
          error: 'An account with this email already exists.',
        })
        return
      }

      const user = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash: await hashPassword(password),
          initials: initialsFromName(name),
          role,
          affiliation,
          expertise: role === 'reviewer' ? expertise : null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          affiliation: true,
        },
      })

      const journalId = req.body?.journalId
        ? String(req.body.journalId)
        : null
      const memberRole = req.body?.memberRole
        ? String(req.body.memberRole)
        : null
      if (journalId && memberRole) {
        await ensureMembership(
          user.id,
          journalId,
          memberRole as
            | 'journal_manager'
            | 'editor'
            | 'section_editor'
            | 'author'
            | 'reviewer'
            | 'copyeditor'
            | 'production',
        )
      }

      notifyAccountWelcome({
        email: user.email,
        name: user.name,
        role: user.role,
        createdByAdmin: true,
      })

      res.status(201).json({
        ok: true,
        user: { ...user, roleLabel: roleLabels[user.role], memberships: [] },
      })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to create user',
      })
    }
  },
)

router.get(
  '/users',
  requireAuth,
  requireRole('admin'),
  async (_req: AuthedRequest, res) => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          affiliation: true,
          createdAt: true,
          memberships: {
            select: {
              id: true,
              role: true,
              journal: { select: { id: true, code: true, name: true } },
            },
          },
        },
        orderBy: [{ role: 'asc' }, { name: 'asc' }],
      })
      res.json({
        ok: true,
        users: users.map((u) => ({
          ...u,
          roleLabel: roleLabels[u.role],
        })),
      })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to load users',
      })
    }
  },
)

router.patch(
  '/users/:id',
  requireAuth,
  requireRole('admin'),
  async (req: AuthedRequest, res) => {
    try {
      const role = String(req.body?.role ?? '').trim() as AppRole
      const allowed: AppRole[] = [
        'author',
        'editor',
        'reviewer',
        'production',
        'copyeditor',
        'journal_manager',
        'admin',
      ]
      if (!allowed.includes(role)) {
        res.status(400).json({ ok: false, error: 'Invalid role.' })
        return
      }
      const userId = param(req.params.id)
      if (userId === req.user!.id && role !== 'admin') {
        res.status(400).json({
          ok: false,
          error: 'You cannot remove your own admin role.',
        })
        return
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          role,
          ...(req.body?.affiliation != null
            ? { affiliation: String(req.body.affiliation).trim() || null }
            : {}),
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          affiliation: true,
        },
      })

      // Optional: attach journal membership when promoting staff
      const journalId = req.body?.journalId
        ? String(req.body.journalId)
        : null
      const memberRole = req.body?.memberRole
        ? String(req.body.memberRole)
        : null
      if (journalId && memberRole) {
        await ensureMembership(
          user.id,
          journalId,
          memberRole as
            | 'journal_manager'
            | 'editor'
            | 'section_editor'
            | 'author'
            | 'reviewer'
            | 'copyeditor'
            | 'production',
        )
      }

      res.json({
        ok: true,
        user: { ...user, roleLabel: roleLabels[user.role] },
      })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to update user',
      })
    }
  },
)

export default router
