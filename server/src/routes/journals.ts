import { Router } from 'express'
import type { JournalMemberRole } from '@prisma/client'
import { prisma } from '../db.js'
import { requireAuth, type AuthedRequest } from '../auth/middleware.js'
import { requireRole } from '../auth/requireRole.js'
import { ensureMembership, isGlobalAdmin } from '../lib/journalAccess.js'
import { createJournalWithDefaults } from '../lib/createJournal.js'
import { param } from '../lib/params.js'

const router = Router()

const MANAGER_ROLES = ['admin', 'journal_manager'] as const

router.get('/', async (_req, res) => {
  try {
    const journals = await prisma.journal.findMany({
      orderBy: { name: 'asc' },
      include: {
        sections: { where: { active: true }, orderBy: { sortOrder: 'asc' } },
        _count: { select: { manuscripts: true, memberships: true } },
      },
    })
    res.json({ ok: true, journals })
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to load journals',
    })
  }
})

/** Site admin creates a journal directly (still available alongside requests). */
router.post(
  '/',
  requireAuth,
  requireRole('admin'),
  async (req: AuthedRequest, res) => {
    try {
      const journal = await createJournalWithDefaults({
        code: String(req.body?.code ?? ''),
        name: String(req.body?.name ?? ''),
        issn: String(req.body?.issn ?? '').trim() || null,
        description: String(req.body?.description ?? '').trim() || null,
        contactEmail: String(req.body?.contactEmail ?? '').trim() || null,
        reviewType: String(req.body?.reviewType ?? 'double_blind'),
        defaultReviewDays: Number(req.body?.defaultReviewDays ?? 21),
        revisionDays: Number(req.body?.revisionDays ?? 30),
        policiesMarkdown: req.body?.policiesMarkdown
          ? String(req.body.policiesMarkdown)
          : null,
        managerUserId: req.user!.id,
      })

      res.status(201).json({ ok: true, journal })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create journal'
      const conflict =
        message.includes('already exists') || message.includes('required')
      res.status(conflict ? 400 : 500).json({ ok: false, error: message })
    }
  },
)

router.get('/:idOrCode', async (req, res) => {
  try {
    const key = param(req.params.idOrCode)
    const journal = await prisma.journal.findFirst({
      where: { OR: [{ id: key }, { code: key }] },
      include: {
        sections: { orderBy: { sortOrder: 'asc' } },
        issues: { orderBy: [{ year: 'desc' }, { volume: 'desc' }] },
      },
    })
    if (!journal) {
      res.status(404).json({ ok: false, error: 'Journal not found.' })
      return
    }
    res.json({ ok: true, journal })
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to load journal',
    })
  }
})

router.patch(
  '/:id',
  requireAuth,
  requireRole('admin', 'journal_manager', 'editor'),
  async (req: AuthedRequest, res) => {
    try {
      const journal = await prisma.journal.findUnique({ where: { id: param(req.params.id) } })
      if (!journal) {
        res.status(404).json({ ok: false, error: 'Journal not found.' })
        return
      }

      if (!isGlobalAdmin(req.user!.role)) {
        const membership = await prisma.journalMembership.findFirst({
          where: {
            userId: req.user!.id,
            journalId: journal.id,
            role: { in: ['journal_manager', 'editor'] },
          },
        })
        if (!membership) {
          res.status(403).json({ ok: false, error: 'Journal manager access required.' })
          return
        }
      }

      const {
        name,
        issn,
        description,
        contactEmail,
        reviewType,
        defaultReviewDays,
        revisionDays,
        policiesMarkdown,
      } = req.body ?? {}

      const updated = await prisma.journal.update({
        where: { id: journal.id },
        data: {
          ...(name != null ? { name: String(name) } : {}),
          ...(issn != null ? { issn: String(issn) || null } : {}),
          ...(description != null ? { description: String(description) || null } : {}),
          ...(contactEmail != null ? { contactEmail: String(contactEmail) || null } : {}),
          ...(reviewType != null ? { reviewType: String(reviewType) } : {}),
          ...(defaultReviewDays != null
            ? { defaultReviewDays: Number(defaultReviewDays) }
            : {}),
          ...(revisionDays != null ? { revisionDays: Number(revisionDays) } : {}),
          ...(policiesMarkdown != null
            ? { policiesMarkdown: String(policiesMarkdown) || null }
            : {}),
        },
      })

      res.json({ ok: true, journal: updated })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to update journal',
      })
    }
  },
)

router.get(
  '/:id/members',
  requireAuth,
  requireRole('admin', 'journal_manager', 'editor'),
  async (req: AuthedRequest, res) => {
    try {
      const members = await prisma.journalMembership.findMany({
        where: { journalId: param(req.params.id) },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true, affiliation: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      })
      res.json({ ok: true, members })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to load members',
      })
    }
  },
)

router.post(
  '/:id/members',
  requireAuth,
  requireRole(...MANAGER_ROLES),
  async (req: AuthedRequest, res) => {
    try {
      const email = String(req.body?.email ?? '').trim().toLowerCase()
      const role = String(req.body?.role ?? 'editor').trim() as JournalMemberRole
      if (!email) {
        res.status(400).json({ ok: false, error: 'Email is required.' })
        return
      }
      const user = await prisma.user.findUnique({ where: { email } })
      if (!user) {
        res.status(404).json({ ok: false, error: 'User not found. They must register first.' })
        return
      }
      const membership = await ensureMembership(user.id, param(req.params.id), role)
      res.json({ ok: true, membership })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to add member',
      })
    }
  },
)

router.delete(
  '/:id/members/:membershipId',
  requireAuth,
  requireRole(...MANAGER_ROLES),
  async (req: AuthedRequest, res) => {
    try {
      await prisma.journalMembership.delete({ where: { id: param(req.params.membershipId) } })
      res.json({ ok: true })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to remove member',
      })
    }
  },
)

router.get('/:id/sections', async (req, res) => {
  try {
    const sections = await prisma.journalSection.findMany({
      where: { journalId: param(req.params.id), active: true },
      orderBy: { sortOrder: 'asc' },
    })
    res.json({ ok: true, sections })
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to load sections',
    })
  }
})

router.post(
  '/:id/sections',
  requireAuth,
  requireRole('admin', 'journal_manager'),
  async (req: AuthedRequest, res) => {
    try {
      const code = String(req.body?.code ?? '').trim().toLowerCase()
      const title = String(req.body?.title ?? '').trim()
      if (!code || !title) {
        res.status(400).json({ ok: false, error: 'code and title are required.' })
        return
      }
      const section = await prisma.journalSection.create({
        data: {
          journalId: param(req.params.id),
          code,
          title,
          description: req.body?.description ? String(req.body.description) : null,
          sortOrder: Number(req.body?.sortOrder ?? 0),
        },
      })
      res.json({ ok: true, section })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to create section',
      })
    }
  },
)

router.patch(
  '/:id/sections/:sectionId',
  requireAuth,
  requireRole('admin', 'journal_manager'),
  async (req: AuthedRequest, res) => {
    try {
      const section = await prisma.journalSection.findFirst({
        where: {
          id: param(req.params.sectionId),
          journalId: param(req.params.id),
        },
      })
      if (!section) {
        res.status(404).json({ ok: false, error: 'Section not found.' })
        return
      }
      const updated = await prisma.journalSection.update({
        where: { id: section.id },
        data: {
          ...(req.body?.title != null ? { title: String(req.body.title).trim() } : {}),
          ...(req.body?.description != null
            ? { description: String(req.body.description).trim() || null }
            : {}),
          ...(req.body?.sortOrder != null
            ? { sortOrder: Number(req.body.sortOrder) }
            : {}),
          ...(typeof req.body?.active === 'boolean' ? { active: req.body.active } : {}),
        },
      })
      res.json({ ok: true, section: updated })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to update section',
      })
    }
  },
)

router.delete(
  '/:id/sections/:sectionId',
  requireAuth,
  requireRole('admin', 'journal_manager'),
  async (req: AuthedRequest, res) => {
    try {
      const section = await prisma.journalSection.findFirst({
        where: {
          id: param(req.params.sectionId),
          journalId: param(req.params.id),
        },
      })
      if (!section) {
        res.status(404).json({ ok: false, error: 'Section not found.' })
        return
      }
      // Soft-delete so existing manuscripts keep their section relation
      await prisma.journalSection.update({
        where: { id: section.id },
        data: { active: false },
      })
      res.json({ ok: true })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to remove section',
      })
    }
  },
)

router.get(
  '/:id/email-templates',
  requireAuth,
  requireRole('admin', 'journal_manager', 'editor'),
  async (req: AuthedRequest, res) => {
    try {
      const templates = await prisma.emailTemplate.findMany({
        where: { journalId: param(req.params.id) },
        orderBy: { key: 'asc' },
      })
      res.json({ ok: true, templates })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to load templates',
      })
    }
  },
)

router.put(
  '/:id/email-templates/:key',
  requireAuth,
  requireRole('admin', 'journal_manager'),
  async (req: AuthedRequest, res) => {
    try {
      const key = param(req.params.key)
      const name = String(req.body?.name ?? key)
      const subject = String(req.body?.subject ?? '')
      const bodyHtml = String(req.body?.bodyHtml ?? '')
      if (!subject || !bodyHtml) {
        res.status(400).json({ ok: false, error: 'subject and bodyHtml are required.' })
        return
      }
      const template = await prisma.emailTemplate.upsert({
        where: {
          journalId_key: { journalId: param(req.params.id), key },
        },
        update: { name, subject, bodyHtml },
        create: {
          journalId: param(req.params.id),
          key,
          name,
          subject,
          bodyHtml,
        },
      })
      res.json({ ok: true, template })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to save template',
      })
    }
  },
)

router.get(
  '/:id/issues',
  requireAuth,
  requireRole('admin', 'journal_manager', 'editor', 'production'),
  async (req: AuthedRequest, res) => {
    try {
      const issues = await prisma.issue.findMany({
        where: { journalId: param(req.params.id) },
        include: {
          manuscripts: {
            select: { id: true, number: true, title: true, status: true, doi: true },
            orderBy: { issueSortOrder: 'asc' },
          },
          _count: { select: { manuscripts: true } },
        },
        orderBy: [{ year: 'desc' }, { volume: 'desc' }, { number: 'desc' }],
      })
      res.json({ ok: true, issues })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to load issues',
      })
    }
  },
)

router.post(
  '/:id/issues',
  requireAuth,
  requireRole('admin', 'journal_manager', 'production'),
  async (req: AuthedRequest, res) => {
    try {
      const volume = String(req.body?.volume ?? '').trim()
      const number = String(req.body?.number ?? '').trim()
      const year = Number(req.body?.year ?? new Date().getFullYear())
      if (!volume || !number) {
        res.status(400).json({ ok: false, error: 'volume and number are required.' })
        return
      }
      const issue = await prisma.issue.create({
        data: {
          journalId: param(req.params.id),
          volume,
          number,
          year,
          title: req.body?.title ? String(req.body.title) : null,
          status: 'planned',
        },
      })
      res.json({ ok: true, issue })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to create issue',
      })
    }
  },
)

export default router
