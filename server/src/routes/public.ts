import { Router } from 'express'
import { prisma } from '../db.js'
import { param } from '../lib/params.js'

const router = Router()

/** Public catalog — OJS-style multi-journal index. */
router.get('/journals', async (_req, res) => {
  try {
    const journals = await prisma.journal.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      select: {
        code: true,
        name: true,
        issn: true,
        description: true,
        coverImageUrl: true,
        subjectTags: true,
        reviewType: true,
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

router.get('/journals/:code', async (req, res) => {
  try {
    const journal = await prisma.journal.findFirst({
      where: { code: param(req.params.code), active: true },
      select: {
        id: true,
        code: true,
        name: true,
        issn: true,
        description: true,
        coverImageUrl: true,
        subjectTags: true,
        contactEmail: true,
        reviewType: true,
        defaultReviewDays: true,
        revisionDays: true,
        policiesMarkdown: true,
        sections: {
          where: { active: true },
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            code: true,
            title: true,
            description: true,
          },
        },
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

router.get('/journals/:code/current-issue', async (req, res) => {
  try {
    const journal = await prisma.journal.findUnique({ where: { code: param(req.params.code) } })
    if (!journal) {
      res.status(404).json({ ok: false, error: 'Journal not found.' })
      return
    }
    const issue = await prisma.issue.findFirst({
      where: { journalId: journal.id, status: 'published' },
      orderBy: [{ publishedAt: 'desc' }, { year: 'desc' }],
      include: {
        manuscripts: {
          where: { status: 'published' },
          orderBy: { issueSortOrder: 'asc' },
          select: {
            id: true,
            number: true,
            title: true,
            authorsText: true,
            doi: true,
            abstract: true,
            galleys: {
              where: { isPrimary: true },
              select: { id: true, label: true, format: true, fileName: true },
            },
          },
        },
      },
    })
    res.json({ ok: true, issue })
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to load current issue',
    })
  }
})

router.get('/journals/:code/issues', async (req, res) => {
  try {
    const journal = await prisma.journal.findUnique({ where: { code: param(req.params.code) } })
    if (!journal) {
      res.status(404).json({ ok: false, error: 'Journal not found.' })
      return
    }
    const issues = await prisma.issue.findMany({
      where: { journalId: journal.id, status: 'published' },
      orderBy: [{ year: 'desc' }, { volume: 'desc' }],
      select: {
        id: true,
        volume: true,
        number: true,
        year: true,
        title: true,
        publishedAt: true,
        _count: { select: { manuscripts: true } },
      },
    })
    res.json({ ok: true, issues })
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to load issues',
    })
  }
})

router.get('/articles/:number', async (req, res) => {
  try {
    const manuscript = await prisma.manuscript.findFirst({
      where: { number: param(req.params.number), status: 'published' },
      include: {
        journal: { select: { code: true, name: true, issn: true } },
        section: { select: { title: true, code: true } },
        authors: { orderBy: { sortOrder: 'asc' } },
        galleys: true,
        issueRecord: true,
      },
    })
    if (!manuscript) {
      res.status(404).json({ ok: false, error: 'Article not found.' })
      return
    }
    res.json({
      ok: true,
      article: {
        number: manuscript.number,
        title: manuscript.title,
        abstract: manuscript.abstract,
        keywords: manuscript.keywords,
        doi: manuscript.doi,
        authors: manuscript.authors.map((a) => ({
          name: a.name,
          affiliation: a.affiliation,
          orcid: a.orcid,
        })),
        journal: manuscript.journal,
        section: manuscript.section,
        issue: manuscript.issueRecord,
        volume: manuscript.volume,
        issueNumber: manuscript.issue,
        galleys: manuscript.galleys.map((g) => ({
          id: g.id,
          label: g.label,
          format: g.format,
          fileName: g.fileName,
          isPrimary: g.isPrimary,
        })),
      },
    })
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to load article',
    })
  }
})

export default router
