import { Router } from 'express'
import type { ManuscriptStatus, Prisma } from '@prisma/client'
import multer from 'multer'
import { prisma } from '../db.js'
import { requireAuth, type AuthedRequest } from '../auth/middleware.js'
import { requireRole } from '../auth/requireRole.js'
import {
  manuscriptInclude,
  nextManuscriptNumber,
  toClientActivity,
  toClientManuscript,
} from '../lib/manuscripts.js'
import {
  getUserJournalIds,
  ensureMembership,
  canManageEditorial,
  isGlobalAdmin,
} from '../lib/journalAccess.js'
import { ensureOpenReviewRound } from '../lib/reviewRounds.js'
import {
  invitationInclude,
  toClientInvitation,
  toClientReview,
  authorMaySeeReviews,
  reviewerFileKinds,
} from '../lib/reviews.js'
import {
  buildFallbackPdf,
  isPdfBuffer,
  readStoredProof,
  readStoredSubmission,
  saveProofBuffer,
  saveProofFile,
  saveRevisionBuffer,
  saveSubmissionBuffer,
} from '../lib/uploads.js'
import {
  notifyAuthorProofSent,
  notifyAuthorPublished,
  notifyDeskRejected,
  notifyEditorialDecision,
  notifyEditorRevisionRouted,
  notifyEditorRevisionSubmitted,
  notifyEicEditorRecommendation,
  notifyFormattingRequested,
  notifyProductionHandoff,
  notifyReviewerInvitation,
  notifySubmissionReceived,
  notifyUnderReview,
} from '../lib/workflowEmails.js'

const router = Router()
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
})
const proofUpload = memoryUpload
const submissionUpload = memoryUpload.fields([
  { name: 'manuscript', maxCount: 1 },
  { name: 'figures', maxCount: 20 },
  { name: 'supplementary', maxCount: 20 },
])

type AuthorInput = {
  name?: string
  email?: string
  affiliation?: string
  corresponding?: boolean
}

type FileInput = {
  kind?: string
  fileName?: string
  sizeBytes?: number
}

function formatAuthorsText(authors: AuthorInput[]) {
  return authors
    .map((author) => {
      const name = String(author.name ?? '').trim()
      const parts = name.split(/\s+/).filter(Boolean)
      if (parts.length <= 1) return name || 'Unknown'
      const last = parts[parts.length - 1]
      const initials = parts
        .slice(0, -1)
        .map((part) => `${part[0]}.`)
        .join(' ')
      return `${initials} ${last}`
    })
    .join(', ')
}

router.get(
  '/',
  requireAuth,
  requireRole(
    'author',
    'office',
    'editor',
    'production',
    'admin',
    'journal_manager',
    'copyeditor',
  ),
  async (req: AuthedRequest, res) => {
    try {
      const role = req.user!.role
      const staffJournalIds =
        role === 'admin'
          ? null
          : await getUserJournalIds(req.user!.id, [
              'journal_manager',
              'editor',
              'section_editor',
              'copyeditor',
              'production',
            ])

      let where: Prisma.ManuscriptWhereInput =
        role === 'author'
          ? { submittingAuthorId: req.user!.id }
          : role === 'journal_manager' || isGlobalAdmin(role)
            ? {} // all journal-scoped submissions (OJS JM / site admin queues)
            : role === 'editor' || role === 'office'
              ? {
                  OR: [
                    {
                      status: {
                        in: [
                          'submitted',
                          'formatting_requested',
                        ] as ManuscriptStatus[],
                      },
                    },
                    { assignedEditorId: req.user!.id },
                    { status: 'copyediting' },
                  ],
                }
              : role === 'copyeditor'
                ? { status: 'copyediting' }
                : role === 'production'
                  ? {
                      status: {
                        in: [
                          'accepted',
                          'copyediting',
                          'in_production',
                          'proof_sent',
                          'ready_for_publication',
                          'published',
                        ] as ManuscriptStatus[],
                      },
                    }
                  : {}

      // Journal tenancy: when memberships exist, scope tightly.
      // Empty membership keeps legacy global queues (demo / newly registered staff).
      if (staffJournalIds && staffJournalIds.length > 0 && role !== 'author') {
        where = {
          AND: [where, { journalId: { in: staffJournalIds } }],
        }
      }

      const manuscripts = await prisma.manuscript.findMany({
        where,
        include: {
          ...manuscriptInclude,
          invitations: {
            include: invitationInclude,
          },
          reviews: {
            select: { id: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      })

      res.json({
        ok: true,
        manuscripts: manuscripts.map((item) => {
          const openInviteCount = item.invitations.filter(
            (inv) =>
              (inv.status === 'sent' || inv.status === 'accepted') && !inv.review,
          ).length
          return {
            ...toClientManuscript(item),
            reviewCount: item.reviews.length,
            openInviteCount,
            awaitingDecision:
              (item.status === 'under_review' &&
                item.reviews.length > 0 &&
                openInviteCount === 0) ||
              item.status === 'revision_submitted',
          }
        }),
      })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to load manuscripts',
      })
    }
  },
)

/** Production pipeline — always returns production-stage manuscripts. */
router.get(
  '/pipeline/production',
  requireAuth,
  requireRole('production', 'admin', 'journal_manager', 'editor'),
  async (_req: AuthedRequest, res) => {
    try {
      const manuscripts = await prisma.manuscript.findMany({
        where: {
          status: {
            in: [
              'accepted',
              'copyediting',
              'in_production',
              'proof_sent',
              'ready_for_publication',
              'published',
            ],
          },
        },
        include: manuscriptInclude,
        orderBy: { updatedAt: 'desc' },
      })

      res.json({
        ok: true,
        manuscripts: manuscripts.map(toClientManuscript),
      })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load production queue',
      })
    }
  },
)

router.get(
  '/activity',
  requireAuth,
  requireRole('author', 'office', 'editor', 'production', 'admin', 'reviewer'),
  async (req: AuthedRequest, res) => {
    try {
      const role = req.user!.role
      let where: Prisma.ActivityEventWhereInput | undefined
      if (role === 'author') {
        where = { manuscript: { submittingAuthorId: req.user!.id } }
      } else if (role === 'editor') {
        where = { manuscript: { assignedEditorId: req.user!.id } }
      } else if (role === 'reviewer') {
        where = {
          manuscript: {
            invitations: { some: { reviewerId: req.user!.id } },
          },
        }
      } else if (role === 'production') {
        where = {
          manuscript: {
            status: {
              in: [
                'accepted',
                'in_production',
                'proof_sent',
                'ready_for_publication',
                'published',
              ] satisfies ManuscriptStatus[],
            },
          },
        }
      }

      const activities = await prisma.activityEvent.findMany({
        where,
        include: { manuscript: { select: { number: true } } },
        orderBy: { createdAt: 'desc' },
        take: 40,
      })
      res.json({ ok: true, activity: activities.map(toClientActivity) })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to load activity',
      })
    }
  },
)

router.get(
  '/:id',
  requireAuth,
  requireRole(
    'author',
    'office',
    'editor',
    'production',
    'admin',
    'reviewer',
    'journal_manager',
    'copyeditor',
  ),
  async (req: AuthedRequest, res) => {
    try {
      const key = String(req.params.id)
      const manuscript = await prisma.manuscript.findFirst({
        where: {
          OR: [{ number: key }, { id: key }],
        },
        include: {
          ...manuscriptInclude,
          activities: {
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: { manuscript: { select: { number: true } } },
          },
          invitations: {
            include: invitationInclude,
            orderBy: { invitedAt: 'desc' },
          },
          reviews: {
            include: {
              reviewer: { select: { name: true } },
            },
            orderBy: { submittedAt: 'desc' },
          },
          editorRecommendations: {
            include: {
              editor: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      })

      if (!manuscript) {
        res.status(404).json({ ok: false, error: 'Manuscript not found.' })
        return
      }

      if (
        req.user!.role === 'author' &&
        manuscript.submittingAuthorId !== req.user!.id
      ) {
        res.status(403).json({ ok: false, error: 'You do not own this manuscript.' })
        return
      }

      if (
        req.user!.role === 'editor' ||
        req.user!.role === 'office' ||
        req.user!.role === 'journal_manager'
      ) {
        const allowed = await canManageEditorial(req.user!, manuscript, {
          allowScreeningQueue: true,
        })
        if (!allowed && req.user!.role !== 'journal_manager') {
          res.status(403).json({
            ok: false,
            error: 'This manuscript is not available in your editorial queue.',
          })
          return
        }
      }

      const isAuthor = req.user!.role === 'author'
      const shareReviewsWithAuthor =
        isAuthor && authorMaySeeReviews(manuscript.status)

      // Chronological order for stable "Reviewer 1/2" labels
      const orderedReviews = [...manuscript.reviews].reverse()

      const reviewsPayload = isAuthor
        ? shareReviewsWithAuthor
          ? orderedReviews.map((item, index) =>
              toClientReview(item, {
                forAuthor: true,
                reviewerLabel: `Reviewer ${index + 1}`,
              }),
            )
          : []
        : manuscript.reviews.map((item) => toClientReview(item))

      const recommendationsPayload = isAuthor
        ? []
        : (manuscript.editorRecommendations ?? []).map((item) => ({
            id: item.id,
            recommendation: item.recommendation,
            note: item.note,
            round: item.round,
            createdAt: item.createdAt.toISOString().slice(0, 10),
            editorName: item.editor.name,
            editorId: item.editor.id,
          }))

      res.json({
        ok: true,
        manuscript: toClientManuscript(manuscript),
        activity: (manuscript.activities ?? []).map(toClientActivity),
        invitations: isAuthor
          ? []
          : manuscript.invitations.map((item) =>
              toClientInvitation({
                ...item,
                manuscript: {
                  id: manuscript.id,
                  number: manuscript.number,
                  title: manuscript.title,
                  journal: manuscript.journal,
                },
              }),
            ),
        reviews: reviewsPayload,
        editorRecommendations: recommendationsPayload,
      })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to load manuscript',
      })
    }
  },
)

router.get(
  '/:id/files/:fileId/download',
  requireAuth,
  requireRole(
    'author',
    'office',
    'editor',
    'production',
    'admin',
    'reviewer',
    'journal_manager',
    'copyeditor',
  ),
  async (req: AuthedRequest, res) => {
    try {
      const key = String(req.params.id)
      const fileId = String(req.params.fileId)
      const manuscript = await prisma.manuscript.findFirst({
        where: { OR: [{ number: key }, { id: key }] },
        include: {
          files: { where: { id: fileId }, take: 1 },
        },
      })

      if (!manuscript || manuscript.files.length === 0) {
        res.status(404).json({ ok: false, error: 'File not found.' })
        return
      }

      if (
        req.user!.role === 'author' &&
        manuscript.submittingAuthorId !== req.user!.id
      ) {
        res.status(403).json({ ok: false, error: 'You do not own this manuscript.' })
        return
      }

      // Staff may download submission materials (OJS: editors see files at screening
      // even before assignment). Authors/reviewers handled above/below.
      if (
        req.user!.role === 'editor' ||
        req.user!.role === 'office' ||
        req.user!.role === 'journal_manager' ||
        req.user!.role === 'copyeditor' ||
        req.user!.role === 'production'
      ) {
        const editorialOk = await canManageEditorial(req.user!, manuscript, {
          allowScreeningQueue: true,
        })
        const stageStaff =
          (req.user!.role === 'production' &&
            [
              'accepted',
              'copyediting',
              'in_production',
              'proof_sent',
              'ready_for_publication',
              'published',
            ].includes(manuscript.status)) ||
          (req.user!.role === 'copyeditor' &&
            ['accepted', 'copyediting'].includes(manuscript.status))
        if (!editorialOk && !stageStaff) {
          res.status(403).json({
            ok: false,
            error: 'You do not have access to this manuscript’s files.',
          })
          return
        }
      }

      if (req.user!.role === 'reviewer') {
        const invitation = await prisma.reviewInvitation.findFirst({
          where: {
            manuscriptId: manuscript.id,
            reviewerId: req.user!.id,
            status: 'accepted',
          },
          select: { id: true },
        })
        if (!invitation) {
          res.status(403).json({
            ok: false,
            error: 'Accept a review invitation before downloading files.',
          })
          return
        }
        const fileKind = manuscript.files[0]!.kind
        if (!reviewerFileKinds.has(fileKind)) {
          res.status(403).json({
            ok: false,
            error: 'This file is not available for peer review.',
          })
          return
        }
      }

      const file = manuscript.files[0]!
      const stored = await readStoredSubmission(file.storagePath)
      if (!stored) {
        res.status(404).json({
          ok: false,
          error:
            'File contents are not available. Re-upload the submission files.',
        })
        return
      }

      const safeName = file.fileName.replace(/"/g, '')
      res.setHeader(
        'Content-Type',
        file.mimeType || 'application/octet-stream',
      )
      res.setHeader('Content-Length', String(stored.data.length))
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
      )
      res.end(stored.data)
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to download file',
      })
    }
  },
)

router.post(
  '/',
  requireAuth,
  requireRole('author'),
  (req, res, next) => {
    const contentType = String(req.headers['content-type'] ?? '')
    if (contentType.includes('multipart/form-data')) {
      submissionUpload(req, res, next)
      return
    }
    next()
  },
  async (req: AuthedRequest, res) => {
    try {
      const payload =
        typeof req.body?.data === 'string'
          ? (JSON.parse(req.body.data) as Record<string, unknown>)
          : (req.body as Record<string, unknown>)

      const status =
        payload?.status === 'submitted'
          ? ('submitted' as ManuscriptStatus)
          : ('draft' as ManuscriptStatus)
      const title = String(payload?.title ?? '').trim()
      const journalCode = String(payload?.journalCode ?? payload?.journalId ?? '')
        .trim()
        .toLowerCase()
      const articleType = String(payload?.articleType ?? 'Research').trim()
      const abstract = String(payload?.abstract ?? '').trim() || null
      const keywords = String(payload?.keywords ?? '').trim() || null
      const specialIssue = String(payload?.specialIssue ?? '').trim() || null
      const sectionId = String(payload?.sectionId ?? '').trim() || null
      const commentsForEditor =
        String(payload?.coverLetter ?? payload?.commentsForEditor ?? '').trim() ||
        null
      const ethics =
        payload?.ethics && typeof payload.ethics === 'object'
          ? (payload.ethics as Record<string, unknown>)
          : {}
      const competingInterests =
        String(ethics.conflictDetails ?? '').trim() || null
      const fundingStatement =
        String(ethics.fundingStatement ?? '').trim() || null
      const dataAvailability =
        String(ethics.dataAvailability ?? '').trim() || null
      const ethicsNotes = String(ethics.ethicsDetails ?? '').trim() || null
      const authors = Array.isArray(payload?.authors)
        ? (payload.authors as AuthorInput[])
        : []

      if (!title) {
        res.status(400).json({ ok: false, error: 'Title is required.' })
        return
      }
      if (!journalCode) {
        res.status(400).json({ ok: false, error: 'Please choose a journal.' })
        return
      }
      if (status === 'submitted' && authors.length === 0) {
        res.status(400).json({
          ok: false,
          error: 'Add at least one author before submitting.',
        })
        return
      }

      const journal = await prisma.journal.findUnique({
        where: { code: journalCode },
      })
      if (!journal) {
        res.status(400).json({
          ok: false,
          error: 'Selected journal was not found.',
        })
        return
      }

      if (sectionId) {
        const section = await prisma.journalSection.findFirst({
          where: { id: sectionId, journalId: journal.id, active: true },
        })
        if (!section) {
          res.status(400).json({ ok: false, error: 'Invalid journal section.' })
          return
        }
      } else if (status === 'submitted') {
        const sectionCount = await prisma.journalSection.count({
          where: { journalId: journal.id, active: true },
        })
        if (sectionCount > 0) {
          res.status(400).json({
            ok: false,
            error: 'Please select a journal section before submitting.',
          })
          return
        }
      }

      const number = await nextManuscriptNumber(prisma)
      const authorsText =
        formatAuthorsText(authors) ||
        (await prisma.user.findUnique({ where: { id: req.user!.id } }))?.name ||
        'Author'

      const uploaded = req.files as
        | { [fieldname: string]: Express.Multer.File[] }
        | undefined

      const manuscript = await prisma.manuscript.create({
        data: {
          number,
          title,
          abstract,
          keywords,
          articleType,
          specialIssue,
          status,
          authorsText,
          commentsForEditor,
          competingInterests,
          fundingStatement,
          dataAvailability,
          ethicsNotes,
          submittedAt: status === 'submitted' ? new Date() : null,
          journalId: journal.id,
          sectionId,
          submittingAuthorId: req.user!.id,
          authors: {
            create: authors.map((author, index) => ({
              name: String(author.name ?? '').trim() || 'Author',
              email: String(author.email ?? '').trim().toLowerCase(),
              affiliation: String(author.affiliation ?? '').trim() || null,
              orcid: String((author as { orcid?: string }).orcid ?? '').trim() || null,
              isCorresponding: Boolean(author.corresponding),
              sortOrder: index,
            })),
          },
          activities: {
            create: {
              actorId: req.user!.id,
              label:
                status === 'submitted' ? 'Submission received' : 'Draft saved',
              detail:
                status === 'submitted'
                  ? `${title} entered editorial screening.`
                  : `${title} saved as a draft.`,
            },
          },
        },
        include: manuscriptInclude,
      })

      const fileCreates: Array<{
        kind: string
        fileName: string
        storagePath: string | null
        mimeType: string | null
        sizeBytes: number | null
      }> = []

      async function persistUploaded(
        kind: string,
        file: Express.Multer.File,
      ) {
        const saved = await saveSubmissionBuffer({
          manuscriptId: manuscript.id,
          kind,
          fileName: file.originalname,
          buffer: file.buffer,
        })
        fileCreates.push({
          kind,
          fileName: saved.fileName,
          storagePath: saved.relativePath,
          mimeType: file.mimetype || null,
          sizeBytes: saved.sizeBytes,
        })
      }

      if (uploaded?.manuscript?.[0]) {
        await persistUploaded('manuscript', uploaded.manuscript[0])
      }
      for (const file of uploaded?.figures ?? []) {
        await persistUploaded('figure', file)
      }
      for (const file of uploaded?.supplementary ?? []) {
        await persistUploaded('supplementary', file)
      }

      // JSON-only fallback (metadata without binary)
      if (fileCreates.length === 0 && Array.isArray(payload?.files)) {
        for (const file of payload.files as FileInput[]) {
          if (!file.fileName) continue
          fileCreates.push({
            kind: String(file.kind ?? 'manuscript'),
            fileName: String(file.fileName),
            storagePath: null,
            mimeType: null,
            sizeBytes:
              typeof file.sizeBytes === 'number' ? file.sizeBytes : null,
          })
        }
      }

      const withFiles =
        fileCreates.length > 0
          ? await prisma.manuscript.update({
              where: { id: manuscript.id },
              data: {
                files: {
                  create: fileCreates,
                },
              },
              include: manuscriptInclude,
            })
          : manuscript

      await ensureMembership(req.user!.id, journal.id, 'author')

      if (status === 'submitted') {
        notifySubmissionReceived({
          manuscriptId: withFiles.id,
          number: withFiles.number,
          title: withFiles.title,
          journalName: journal.name,
          journalId: journal.id,
        })
      }

      res.status(201).json({
        ok: true,
        manuscript: toClientManuscript(withFiles),
      })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error:
          error instanceof Error ? error.message : 'Failed to create manuscript',
      })
    }
  },
)

router.post(
  '/:id/submit',
  requireAuth,
  requireRole('author'),
  async (req: AuthedRequest, res) => {
    try {
      const key = String(req.params.id)
      const existing = await prisma.manuscript.findFirst({
        where: {
          OR: [{ number: key }, { id: key }],
          submittingAuthorId: req.user!.id,
        },
      })

      if (!existing) {
        res.status(404).json({ ok: false, error: 'Manuscript not found.' })
        return
      }
      if (!['draft', 'formatting_requested'].includes(existing.status)) {
        res.status(400).json({
          ok: false,
          error: 'Only drafts or formatting revisions can be submitted.',
        })
        return
      }

      const manuscript = await prisma.manuscript.update({
        where: { id: existing.id },
        data: {
          status: 'submitted',
          submittedAt: new Date(),
          activities: {
            create: {
              actorId: req.user!.id,
              label: 'Submission received',
              detail: `${existing.title} entered editorial screening.`,
            },
          },
        },
        include: manuscriptInclude,
      })

      notifySubmissionReceived({
        manuscriptId: manuscript.id,
        number: manuscript.number,
        title: manuscript.title,
        journalName: manuscript.journal?.name,
        journalId: manuscript.journalId,
      })

      res.json({ ok: true, manuscript: toClientManuscript(manuscript) })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to submit manuscript',
      })
    }
  },
)

router.post(
  '/:id/revision',
  requireAuth,
  requireRole('author'),
  proofUpload.single('file'),
  async (req: AuthedRequest, res) => {
    try {
      const key = String(req.params.id)
      const responseLetter = String(req.body?.responseLetter ?? '').trim()

      const existing = await prisma.manuscript.findFirst({
        where: {
          OR: [{ number: key }, { id: key }],
          submittingAuthorId: req.user!.id,
        },
      })

      if (!existing) {
        res.status(404).json({ ok: false, error: 'Manuscript not found.' })
        return
      }
      if (
        !['revision_requested', 'formatting_requested'].includes(existing.status)
      ) {
        res.status(400).json({
          ok: false,
          error: 'This manuscript is not awaiting a revision.',
        })
        return
      }
      if (!responseLetter) {
        res.status(400).json({
          ok: false,
          error: 'Please include a response letter.',
        })
        return
      }

      const uploaded = req.file
      const fileName = String(
        uploaded?.originalname || req.body?.fileName || '',
      ).trim()
      if (!fileName) {
        res.status(400).json({
          ok: false,
          error: 'Please upload a revised manuscript file.',
        })
        return
      }

      const nextVersion = existing.version + 1
      // Content revisions go to EIC first; formatting returns to screening.
      const nextStatus =
        existing.status === 'formatting_requested'
          ? 'submitted'
          : 'revision_submitted'

      let savedPath: string | null = null
      let savedSize: number | null = null
      let savedName = fileName
      if (uploaded) {
        const saved = await saveRevisionBuffer({
          manuscriptId: existing.id,
          version: nextVersion,
          fileName,
          buffer: uploaded.buffer,
        })
        savedPath = saved.relativePath
        savedSize = saved.sizeBytes
        savedName = saved.fileName
      }

      const manuscript = await prisma.manuscript.update({
        where: { id: existing.id },
        data: {
          status: nextStatus,
          version: nextVersion,
          lastResponseLetter: responseLetter,
          revisionDueAt: null,
          files: {
            create: {
              kind:
                existing.status === 'formatting_requested'
                  ? 'formatting_revision'
                  : 'revision',
              fileName: savedName,
              storagePath: savedPath,
              mimeType: uploaded?.mimetype || null,
              sizeBytes: savedSize,
            },
          },
          activities: {
            create: {
              actorId: req.user!.id,
              label:
                existing.status === 'formatting_requested'
                  ? 'Formatting revision submitted'
                  : 'Revision submitted to Editor in Chief',
              detail:
                existing.status === 'formatting_requested'
                  ? `Version v${nextVersion} uploaded (${fileName}).`
                  : `Version v${nextVersion} uploaded (${fileName}). Awaiting EIC routing to an editor before the next review round.`,
            },
          },
        },
        include: manuscriptInclude,
      })

      notifyEditorRevisionSubmitted({
        manuscriptId: manuscript.id,
        number: manuscript.number,
        title: manuscript.title,
        journalName: manuscript.journal?.name,
        journalId: manuscript.journalId,
        kind:
          existing.status === 'formatting_requested' ? 'formatting' : 'content',
      })

      res.json({ ok: true, manuscript: toClientManuscript(manuscript) })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to submit revision',
      })
    }
  },
)

router.post(
  '/:id/screening',
  requireAuth,
  requireRole('editor', 'office', 'journal_manager', 'admin'),
  async (req: AuthedRequest, res) => {
    try {
      const key = String(req.params.id)
      const action = String(req.body?.action ?? '')
      const notes = String(req.body?.notes ?? '').trim()
      const rejectReason = String(req.body?.rejectReason ?? '').trim()
      const editorIdRaw = String(req.body?.editorId ?? '').trim()

      const existing = await prisma.manuscript.findFirst({
        where: {
          OR: [{ number: key }, { id: key }],
        },
      })

      if (!existing) {
        res.status(404).json({ ok: false, error: 'Manuscript not found.' })
        return
      }

      if (!['submitted', 'formatting_requested'].includes(existing.status)) {
        res.status(400).json({
          ok: false,
          error: 'This manuscript is not awaiting screening.',
        })
        return
      }

      if (action === 'pass') {
        const targetEditorId = editorIdRaw || req.user!.id
        const editor = await prisma.user.findFirst({
          where: {
            id: targetEditorId,
            role: { in: ['editor', 'journal_manager', 'office', 'admin'] },
          },
        })
        if (!editor) {
          res.status(400).json({ ok: false, error: 'Selected editor not found.' })
          return
        }
        const assignedEditorId = editor.id
        const assignedName = editor.name

        const manuscript = await prisma.manuscript.update({
          where: { id: existing.id },
          data: {
            status: 'under_review',
            assignedEditorId,
            officeNotes: notes || existing.officeNotes,
            activities: {
              create: {
                actorId: req.user!.id,
                label: 'Passed screening',
                detail: `Assigned to ${assignedName}. Ready to invite reviewers.`,
              },
            },
          },
          include: manuscriptInclude,
        })

        await ensureOpenReviewRound(manuscript.id, 1)
        await ensureMembership(assignedEditorId, manuscript.journalId, 'editor')

        notifyUnderReview({
          manuscriptId: manuscript.id,
          number: manuscript.number,
          title: manuscript.title,
          journalName: manuscript.journal?.name,
        })

        res.json({ ok: true, manuscript: toClientManuscript(manuscript) })
        return
      }

      if (action === 'formatting') {
        if (!notes) {
          res.status(400).json({
            ok: false,
            error: 'Add notes describing the formatting issues.',
          })
          return
        }

        const manuscript = await prisma.manuscript.update({
          where: { id: existing.id },
          data: {
            status: 'formatting_requested',
            officeNotes: notes,
            activities: {
              create: {
                actorId: req.user!.id,
                label: 'Formatting revision requested',
                detail: notes,
              },
            },
          },
          include: manuscriptInclude,
        })

        notifyFormattingRequested({
          manuscriptId: manuscript.id,
          number: manuscript.number,
          title: manuscript.title,
          journalName: manuscript.journal?.name,
          notes,
        })

        res.json({ ok: true, manuscript: toClientManuscript(manuscript) })
        return
      }

      if (action === 'desk_reject') {
        if (!rejectReason) {
          res.status(400).json({
            ok: false,
            error: 'Provide a desk-reject reason for the author.',
          })
          return
        }

        const manuscript = await prisma.manuscript.update({
          where: { id: existing.id },
          data: {
            status: 'rejected',
            rejectReason,
            officeNotes: notes || existing.officeNotes,
            activities: {
              create: {
                actorId: req.user!.id,
                label: 'Desk rejected',
                detail: rejectReason,
              },
            },
          },
          include: manuscriptInclude,
        })

        notifyDeskRejected({
          manuscriptId: manuscript.id,
          number: manuscript.number,
          title: manuscript.title,
          journalName: manuscript.journal?.name,
          reason: rejectReason,
        })

        res.json({ ok: true, manuscript: toClientManuscript(manuscript) })
        return
      }

      res.status(400).json({
        ok: false,
        error: 'Invalid action. Use pass, formatting, or desk_reject.',
      })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Screening action failed',
      })
    }
  },
)

router.post(
  '/:id/assign-editor',
  requireAuth,
  requireRole('editor', 'office', 'journal_manager', 'admin'),
  async (req: AuthedRequest, res) => {
    try {
      const key = String(req.params.id)
      const editorId = String(req.body?.editorId ?? '').trim()
      if (!editorId) {
        res.status(400).json({ ok: false, error: 'editorId is required.' })
        return
      }

      const existing = await prisma.manuscript.findFirst({
        where: { OR: [{ number: key }, { id: key }] },
      })
      if (!existing) {
        res.status(404).json({ ok: false, error: 'Manuscript not found.' })
        return
      }

      const allowed = await canManageEditorial(req.user!, existing, {
        allowScreeningQueue: true,
      })
      if (!allowed) {
        res.status(403).json({ ok: false, error: 'Not allowed to assign editor.' })
        return
      }

      const editor = await prisma.user.findFirst({
        where: {
          id: editorId,
          role: { in: ['editor', 'journal_manager', 'office', 'admin'] },
        },
      })
      if (!editor) {
        res.status(400).json({ ok: false, error: 'Editor not found.' })
        return
      }

      const manuscript = await prisma.manuscript.update({
        where: { id: existing.id },
        data: {
          assignedEditorId: editor.id,
          activities: {
            create: {
              actorId: req.user!.id,
              label: 'Editor assigned',
              detail: `${editor.name} assigned as editor.`,
            },
          },
        },
        include: manuscriptInclude,
      })

      await ensureMembership(editor.id, manuscript.journalId, 'editor')
      res.json({ ok: true, manuscript: toClientManuscript(manuscript) })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to assign editor',
      })
    }
  },
)

router.post(
  '/:id/files',
  requireAuth,
  requireRole('editor', 'office', 'journal_manager', 'admin', 'production', 'copyeditor'),
  async (req: AuthedRequest, res) => {
    try {
      const key = String(req.params.id)
      const kind = String(req.body?.kind ?? 'other').trim() || 'other'
      const fileName = String(req.body?.fileName ?? '').trim()
      const visibility = String(req.body?.visibility ?? 'staff').trim() || 'staff'
      const reviewRoundId = String(req.body?.reviewRoundId ?? '').trim() || null

      if (!fileName) {
        res.status(400).json({ ok: false, error: 'fileName is required.' })
        return
      }
      if (!['author', 'staff', 'review'].includes(visibility)) {
        res.status(400).json({
          ok: false,
          error: 'visibility must be author, staff, or review.',
        })
        return
      }

      const existing = await prisma.manuscript.findFirst({
        where: { OR: [{ number: key }, { id: key }] },
      })
      if (!existing) {
        res.status(404).json({ ok: false, error: 'Manuscript not found.' })
        return
      }

      const allowed = await canManageEditorial(req.user!, existing, {
        allowScreeningQueue: true,
      })
      if (
        !allowed &&
        req.user!.role !== 'production' &&
        req.user!.role !== 'copyeditor'
      ) {
        res.status(403).json({ ok: false, error: 'Not allowed to add files.' })
        return
      }

      const file = await prisma.manuscriptFile.create({
        data: {
          manuscriptId: existing.id,
          kind,
          fileName,
          visibility,
          reviewRoundId,
        },
      })

      await prisma.activityEvent.create({
        data: {
          manuscriptId: existing.id,
          actorId: req.user!.id,
          label: 'File added',
          detail: `${fileName} (${kind}, ${visibility})`,
        },
      })

      res.status(201).json({
        ok: true,
        file: {
          id: file.id,
          kind: file.kind,
          fileName: file.fileName,
          visibility: file.visibility,
          sizeBytes: file.sizeBytes,
        },
      })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to add file',
      })
    }
  },
)

router.patch(
  '/:id/files/:fileId',
  requireAuth,
  requireRole('editor', 'office', 'journal_manager', 'admin'),
  async (req: AuthedRequest, res) => {
    try {
      const key = String(req.params.id)
      const fileId = String(req.params.fileId)
      const visibility = String(req.body?.visibility ?? '').trim()
      if (!['author', 'staff', 'review'].includes(visibility)) {
        res.status(400).json({
          ok: false,
          error: 'visibility must be author, staff, or review.',
        })
        return
      }

      const existing = await prisma.manuscript.findFirst({
        where: { OR: [{ number: key }, { id: key }] },
      })
      if (!existing) {
        res.status(404).json({ ok: false, error: 'Manuscript not found.' })
        return
      }
      const allowed = await canManageEditorial(req.user!, existing)
      if (!allowed) {
        res.status(403).json({ ok: false, error: 'Not allowed.' })
        return
      }

      const existingFile = await prisma.manuscriptFile.findFirst({
        where: { id: fileId, manuscriptId: existing.id },
      })
      if (!existingFile) {
        res.status(404).json({ ok: false, error: 'File not found.' })
        return
      }
      const file = await prisma.manuscriptFile.update({
        where: { id: existingFile.id },
        data: { visibility },
      })

      await prisma.activityEvent.create({
        data: {
          manuscriptId: existing.id,
          actorId: req.user!.id,
          label: 'File visibility updated',
          detail: `${file.fileName} → ${visibility}`,
        },
      })

      res.json({
        ok: true,
        file: {
          id: file.id,
          kind: file.kind,
          fileName: file.fileName,
          visibility: file.visibility,
        },
      })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to update file',
      })
    }
  },
)

router.post(
  '/:id/invitations',
  requireAuth,
  requireRole('editor', 'office', 'journal_manager', 'admin'),
  async (req: AuthedRequest, res) => {
    try {
      const key = String(req.params.id)
      const reviewerId = String(req.body?.reviewerId ?? '').trim()
      const deadlineDays = Number(req.body?.deadlineDays ?? 21)

      const manuscript = await prisma.manuscript.findFirst({
        where: {
          OR: [{ number: key }, { id: key }],
        },
      })

      if (!manuscript) {
        res.status(404).json({ ok: false, error: 'Manuscript not found.' })
        return
      }

      const allowed = await canManageEditorial(req.user!, manuscript)
      if (!allowed) {
        res.status(403).json({
          ok: false,
          error: 'Only the assigned editor or journal manager can invite reviewers.',
        })
        return
      }

      if (manuscript.status !== 'under_review') {
        res.status(400).json({
          ok: false,
          error: 'Invitations are only available while under review.',
        })
        return
      }

      const reviewer = await prisma.user.findFirst({
        where: { id: reviewerId, role: 'reviewer' },
      })
      if (!reviewer) {
        res.status(400).json({ ok: false, error: 'Reviewer not found.' })
        return
      }

      // Conflict: reviewer cannot be co-author or assigned editor
      if (manuscript.assignedEditorId === reviewer.id) {
        res.status(400).json({
          ok: false,
          error: 'Assigned editor cannot review this manuscript.',
        })
        return
      }
      if (manuscript.submittingAuthorId === reviewer.id) {
        res.status(400).json({
          ok: false,
          error: 'Submitting author cannot review their own manuscript.',
        })
        return
      }
      const coAuthor = await prisma.manuscriptAuthor.findFirst({
        where: {
          manuscriptId: manuscript.id,
          OR: [{ userId: reviewer.id }, { email: reviewer.email }],
        },
      })
      if (coAuthor) {
        res.status(400).json({
          ok: false,
          error: 'Co-authors cannot be invited as reviewers.',
        })
        return
      }

      // Only block if this reviewer still has an unfinished invite (sent/accepted
      // with no report). Completed round-1 reviews must not block re-invite in
      // later rounds after EIC routes a revision.
      const existingOpen = await prisma.reviewInvitation.findFirst({
        where: {
          manuscriptId: manuscript.id,
          reviewerId: reviewer.id,
          status: { in: ['sent', 'accepted'] },
          review: null,
        },
      })
      if (existingOpen) {
        res.status(409).json({
          ok: false,
          error: 'This reviewer already has an open invitation.',
        })
        return
      }

      const days = [14, 21, 28, 35].includes(deadlineDays) ? deadlineDays : 21
      const deadline = new Date()
      deadline.setDate(deadline.getDate() + days)

      const reviewRound = await ensureOpenReviewRound(
        manuscript.id,
        manuscript.version,
      )

      const invitation = await prisma.reviewInvitation.create({
        data: {
          manuscriptId: manuscript.id,
          reviewerId: reviewer.id,
          invitedById: req.user!.id,
          deadline,
          round: reviewRound.roundNumber,
          reviewRoundId: reviewRound.id,
          status: 'sent',
        },
        include: {
          ...invitationInclude,
          manuscript: {
            select: {
              id: true,
              number: true,
              title: true,
              journal: { select: { name: true } },
            },
          },
        },
      })

      await prisma.activityEvent.create({
        data: {
          manuscriptId: manuscript.id,
          actorId: req.user!.id,
          label: 'Reviewer invited',
          detail: `${reviewer.name} invited (due ${deadline.toISOString().slice(0, 10)}).`,
        },
      })

      notifyReviewerInvitation({
        reviewerEmail: reviewer.email,
        reviewerName: reviewer.name,
        number: manuscript.number,
        title: manuscript.title,
        journalName: invitation.manuscript?.journal?.name,
        deadline: deadline.toISOString().slice(0, 10),
        round: manuscript.version,
      })

      res.status(201).json({
        ok: true,
        invitation: toClientInvitation(invitation),
      })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to invite reviewer',
      })
    }
  },
)

/** Handling editor proposes a recommendation to EIC (does not notify author). */
router.post(
  '/:id/editor-recommendation',
  requireAuth,
  requireRole('editor', 'office', 'journal_manager', 'admin'),
  async (req: AuthedRequest, res) => {
    try {
      const key = String(req.params.id)
      const recommendation = String(req.body?.recommendation ?? '')
      const note = String(req.body?.note ?? '').trim()

      const allowed = [
        'accept',
        'minor_revision',
        'major_revision',
        'reject',
      ] as const
      if (!allowed.includes(recommendation as (typeof allowed)[number])) {
        res.status(400).json({ ok: false, error: 'Invalid recommendation.' })
        return
      }
      if (!note) {
        res.status(400).json({
          ok: false,
          error: 'Add a note explaining your recommendation for the Editor in Chief.',
        })
        return
      }

      const existing = await prisma.manuscript.findFirst({
        where: { OR: [{ number: key }, { id: key }] },
      })
      if (!existing) {
        res.status(404).json({ ok: false, error: 'Manuscript not found.' })
        return
      }

      const allowedEd = await canManageEditorial(req.user!, existing)
      if (!allowedEd) {
        res.status(403).json({
          ok: false,
          error: 'Only the handling editor can propose a recommendation.',
        })
        return
      }
      if (existing.status !== 'under_review') {
        res.status(400).json({
          ok: false,
          error: 'Recommendations are only available while under review.',
        })
        return
      }

      const reviewCount = await prisma.reviewReport.count({
        where: { manuscriptId: existing.id },
      })
      if (reviewCount < 1) {
        res.status(400).json({
          ok: false,
          error: 'Wait for at least one reviewer report before recommending.',
        })
        return
      }

      const openRound = await prisma.reviewRound.findFirst({
        where: { manuscriptId: existing.id, status: 'open' },
        orderBy: { roundNumber: 'desc' },
      })

      const created = await prisma.editorRecommendation.create({
        data: {
          manuscriptId: existing.id,
          editorId: req.user!.id,
          recommendation: recommendation as (typeof allowed)[number],
          note,
          round: openRound?.roundNumber ?? existing.version,
          reviewRoundId: openRound?.id,
        },
        include: {
          editor: { select: { id: true, name: true, email: true } },
        },
      })

      await prisma.activityEvent.create({
        data: {
          manuscriptId: existing.id,
          actorId: req.user!.id,
          label: 'Editor recommendation for EIC',
          detail: `${created.editor.name} recommends ${recommendation.replace('_', ' ')}. Pending Editor in Chief final decision.`,
        },
      })

      notifyEicEditorRecommendation({
        manuscriptId: existing.id,
        number: existing.number,
        title: existing.title,
        journalId: existing.journalId,
        editorName: created.editor.name,
        recommendation,
        note,
      })

      res.status(201).json({
        ok: true,
        recommendation: {
          id: created.id,
          recommendation: created.recommendation,
          note: created.note,
          round: created.round,
          createdAt: created.createdAt.toISOString().slice(0, 10),
          editorName: created.editor.name,
          editorId: created.editor.id,
        },
      })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to save editor recommendation',
      })
    }
  },
)

/** EIC routes an author revision to a handling editor and opens the next review round. */
router.post(
  '/:id/route-revision',
  requireAuth,
  requireRole('admin', 'journal_manager'),
  async (req: AuthedRequest, res) => {
    try {
      const key = String(req.params.id)
      const editorIdRaw = String(req.body?.editorId ?? '').trim()

      const existing = await prisma.manuscript.findFirst({
        where: { OR: [{ number: key }, { id: key }] },
      })
      if (!existing) {
        res.status(404).json({ ok: false, error: 'Manuscript not found.' })
        return
      }
      if (existing.status !== 'revision_submitted') {
        res.status(400).json({
          ok: false,
          error: 'Only revisions awaiting EIC routing can be assigned here.',
        })
        return
      }

      const targetEditorId = editorIdRaw || existing.assignedEditorId || req.user!.id
      const editor = await prisma.user.findFirst({
        where: {
          id: targetEditorId,
          role: { in: ['editor', 'journal_manager', 'office', 'admin'] },
        },
      })
      if (!editor) {
        res.status(400).json({ ok: false, error: 'Selected editor not found.' })
        return
      }

      const nextRoundNumber =
        (await prisma.reviewRound.count({
          where: { manuscriptId: existing.id },
        })) + 1

      const manuscript = await prisma.$transaction(async (tx) => {
        await tx.reviewRound.updateMany({
          where: { manuscriptId: existing.id, status: 'open' },
          data: {
            status: 'closed',
            closedAt: new Date(),
            closedById: req.user!.id,
          },
        })

        await tx.reviewRound.create({
          data: {
            manuscriptId: existing.id,
            roundNumber: nextRoundNumber,
            status: 'open',
            notes: `Opened by Editor in Chief after author revision v${existing.version}.`,
          },
        })

        return tx.manuscript.update({
          where: { id: existing.id },
          data: {
            status: 'under_review',
            assignedEditorId: editor.id,
            activities: {
              create: {
                actorId: req.user!.id,
                label: 'Revision routed to editor',
                detail: `Assigned to ${editor.name} for review round ${nextRoundNumber}. Editor may invite previous or new reviewers.`,
              },
            },
          },
          include: manuscriptInclude,
        })
      })

      await ensureMembership(editor.id, manuscript.journalId, 'editor')

      notifyEditorRevisionRouted({
        manuscriptId: manuscript.id,
        number: manuscript.number,
        title: manuscript.title,
        journalName: manuscript.journal?.name,
        editorEmail: editor.email,
        editorName: editor.name,
        roundNumber: nextRoundNumber,
      })

      res.json({ ok: true, manuscript: toClientManuscript(manuscript) })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error:
          error instanceof Error ? error.message : 'Failed to route revision',
      })
    }
  },
)

/** Final decision to the author — Editor in Chief only. */
router.post(
  '/:id/decision',
  requireAuth,
  requireRole('admin', 'journal_manager'),
  async (req: AuthedRequest, res) => {
    try {
      const key = String(req.params.id)
      const decision = String(req.body?.decision ?? '')
      const letter = String(req.body?.letter ?? '').trim()
      const revisionDays = Number(req.body?.revisionDays ?? 21)

      const allowed = [
        'accept',
        'minor_revision',
        'major_revision',
        'reject',
      ] as const
      if (!allowed.includes(decision as (typeof allowed)[number])) {
        res.status(400).json({ ok: false, error: 'Invalid decision.' })
        return
      }
      if (!letter) {
        res.status(400).json({ ok: false, error: 'Decision letter is required.' })
        return
      }

      const existing = await prisma.manuscript.findFirst({
        where: {
          OR: [{ number: key }, { id: key }],
        },
      })
      if (!existing) {
        res.status(404).json({ ok: false, error: 'Manuscript not found.' })
        return
      }

      if (req.user!.role !== 'admin' && req.user!.role !== 'journal_manager') {
        res.status(403).json({
          ok: false,
          error: 'Only the Editor in Chief can send the final decision to the author.',
        })
        return
      }
      if (!['under_review', 'revision_requested'].includes(existing.status)) {
        res.status(400).json({
          ok: false,
          error: 'Decision is not available for this status.',
        })
        return
      }

      const reviewCount = await prisma.reviewReport.count({
        where: { manuscriptId: existing.id },
      })
      if (reviewCount < 1) {
        res.status(400).json({
          ok: false,
          error:
            'Invite reviewers and wait for at least one review report before recording a decision.',
        })
        return
      }

      if (decision === 'accept') {
        const openInvites = await prisma.reviewInvitation.count({
          where: {
            manuscriptId: existing.id,
            status: { in: ['sent', 'accepted'] },
            review: null,
          },
        })
        if (openInvites > 0) {
          res.status(400).json({
            ok: false,
            error:
              'Cannot accept while review invitations are still open. Wait for reports or withdraw outstanding invites.',
          })
          return
        }
      }

      let nextStatus: ManuscriptStatus = 'under_review'
      let revisionDueAt: Date | null = null
      // OJS: Accept enters Copyediting (not production queue alone)
      if (decision === 'accept') nextStatus = 'copyediting'
      else if (decision === 'reject') nextStatus = 'rejected'
      else {
        nextStatus = 'revision_requested'
        const days = [14, 21, 30, 45].includes(revisionDays) ? revisionDays : 21
        revisionDueAt = new Date()
        revisionDueAt.setDate(revisionDueAt.getDate() + days)
      }

      const openRound = await prisma.reviewRound.findFirst({
        where: { manuscriptId: existing.id, status: 'open' },
        orderBy: { roundNumber: 'desc' },
      })

      const manuscript = await prisma.$transaction(async (tx) => {
        await tx.editorialDecision.create({
          data: {
            manuscriptId: existing.id,
            decidedById: req.user!.id,
            decision: decision as (typeof allowed)[number],
            letter,
            round: existing.version,
            reviewRoundId: openRound?.id,
          },
        })

        if (openRound && (decision === 'accept' || decision === 'reject')) {
          await tx.reviewRound.update({
            where: { id: openRound.id },
            data: {
              status: 'closed',
              closedAt: new Date(),
              closedById: req.user!.id,
            },
          })
        }

        return tx.manuscript.update({
          where: { id: existing.id },
          data: {
            status: nextStatus,
            decision: decision as (typeof allowed)[number],
            decisionLetter: letter,
            decisionAt: new Date(),
            revisionDueAt,
            activities: {
              create: {
                actorId: req.user!.id,
                label: 'Editor in Chief decision',
                detail:
                  decision === 'accept'
                    ? `accept — moved to copyediting. ${letter.slice(0, 100)}`
                    : `${decision.replace('_', ' ')} — ${letter.slice(0, 120)}`,
              },
            },
          },
          include: manuscriptInclude,
        })
      })

      notifyEditorialDecision({
        manuscriptId: manuscript.id,
        number: manuscript.number,
        title: manuscript.title,
        journalName: manuscript.journal?.name,
        decision: decision as
          | 'accept'
          | 'reject'
          | 'minor_revision'
          | 'major_revision',
        letter,
        revisionDueAt: revisionDueAt
          ? revisionDueAt.toISOString().slice(0, 10)
          : null,
      })

      res.json({ ok: true, manuscript: toClientManuscript(manuscript) })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to record decision',
      })
    }
  },
)

async function findManuscriptByKey(key: string) {
  return prisma.manuscript.findFirst({
    where: { OR: [{ number: key }, { id: key }] },
  })
}

router.post(
  '/:id/production/start',
  requireAuth,
  requireRole('production', 'admin', 'journal_manager', 'editor'),
  async (req: AuthedRequest, res) => {
    try {
      const key = String(req.params.id)
      const notes = String(req.body?.notes ?? '').trim()
      const existing = await findManuscriptByKey(key)
      if (!existing) {
        res.status(404).json({ ok: false, error: 'Manuscript not found.' })
        return
      }
      if (!['accepted', 'copyediting'].includes(existing.status)) {
        res.status(400).json({
          ok: false,
          error: 'Manuscript must complete (or skip via accept legacy) copyediting before production.',
        })
        return
      }

      if (existing.status === 'copyediting') {
        const approved = await prisma.copyeditAssignment.findFirst({
          where: { manuscriptId: existing.id, status: 'approved' },
        })
        // Allow production if no copyeditor was assigned yet (manager skip)
        // or if an approved assignment exists
        const anyAssignment = await prisma.copyeditAssignment.count({
          where: { manuscriptId: existing.id },
        })
        if (anyAssignment > 0 && !approved) {
          res.status(400).json({
            ok: false,
            error: 'Approve copyediting before starting production.',
          })
          return
        }
      }

      const manuscript = await prisma.manuscript.update({
        where: { id: existing.id },
        data: {
          status: 'in_production',
          productionNotes: notes || existing.productionNotes,
          activities: {
            create: {
              actorId: req.user!.id,
              label: 'Production started',
              detail: notes || 'Manuscript handed to production.',
            },
          },
        },
        include: manuscriptInclude,
      })

      notifyProductionHandoff({
        manuscriptId: manuscript.id,
        number: manuscript.number,
        title: manuscript.title,
        journalName: manuscript.journal?.name,
        journalId: manuscript.journalId,
      })

      res.json({ ok: true, manuscript: toClientManuscript(manuscript) })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to start production',
      })
    }
  },
)

router.post(
  '/:id/production/proof',
  requireAuth,
  requireRole('production', 'admin', 'journal_manager', 'editor'),
  proofUpload.single('file'),
  async (req: AuthedRequest, res) => {
    try {
      const key = String(req.params.id)
      const notes = String(req.body?.notes ?? '').trim()
      const existing = await findManuscriptByKey(key)

      if (!existing) {
        res.status(404).json({ ok: false, error: 'Manuscript not found.' })
        return
      }
      if (
        !['in_production', 'ready_for_publication', 'proof_sent'].includes(
          existing.status,
        )
      ) {
        res.status(400).json({
          ok: false,
          error: 'Proofs can be sent from production.',
        })
        return
      }

      const uploaded = req.file
      const fileName = String(
        uploaded?.originalname || req.body?.fileName || '',
      ).trim()
      const fileBase64 = String(req.body?.fileBase64 ?? '').trim()
      const mimeType = String(
        uploaded?.mimetype || req.body?.mimeType || 'application/pdf',
      ).trim()

      if (!fileName) {
        res.status(400).json({ ok: false, error: 'Please attach a proof PDF.' })
        return
      }

      const proofRound = (existing.proofRound ?? 0) + 1
      const saved = uploaded
        ? await saveProofBuffer({
            manuscriptId: existing.id,
            round: proofRound,
            fileName,
            buffer: uploaded.buffer,
          })
        : fileBase64
          ? await saveProofFile({
              manuscriptId: existing.id,
              round: proofRound,
              fileName,
              base64: fileBase64,
            })
          : null

      if (!saved) {
        res.status(400).json({
          ok: false,
          error: 'Please choose a proof PDF file to upload.',
        })
        return
      }

      const manuscript = await prisma.manuscript.update({
        where: { id: existing.id },
        data: {
          status: 'proof_sent',
          proofFileName: fileName,
          proofRound,
          proofCorrections: null,
          productionNotes: notes || existing.productionNotes,
          files: {
            create: {
              kind: 'proof',
              fileName: saved.fileName,
              storagePath: saved.relativePath,
              mimeType: mimeType || 'application/pdf',
              sizeBytes: saved.sizeBytes,
            },
          },
          activities: {
            create: {
              actorId: req.user!.id,
              label: 'Proof ready',
              detail: `Proof round ${proofRound} sent to author (${fileName}).`,
            },
          },
        },
        include: manuscriptInclude,
      })

      notifyAuthorProofSent({
        manuscriptId: manuscript.id,
        number: manuscript.number,
        title: manuscript.title,
        journalName: manuscript.journal?.name,
      })

      res.json({ ok: true, manuscript: toClientManuscript(manuscript) })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to send proof',
      })
    }
  },
)

router.get(
  '/:id/production/proof/download',
  requireAuth,
  requireRole('author', 'production', 'admin', 'editor', 'office'),
  async (req: AuthedRequest, res) => {
    try {
      const key = String(req.params.id)
      const manuscript = await prisma.manuscript.findFirst({
        where: { OR: [{ number: key }, { id: key }] },
        include: {
          files: {
            where: { kind: 'proof' },
            orderBy: { uploadedAt: 'desc' },
            take: 1,
          },
        },
      })

      if (!manuscript) {
        res.status(404).json({ ok: false, error: 'Manuscript not found.' })
        return
      }

      if (
        req.user!.role === 'author' &&
        manuscript.submittingAuthorId !== req.user!.id
      ) {
        res.status(403).json({ ok: false, error: 'You do not own this manuscript.' })
        return
      }

      if (!manuscript.proofFileName && manuscript.files.length === 0) {
        res.status(404).json({ ok: false, error: 'No proof file available.' })
        return
      }

      const latest = manuscript.files[0]
      const stored = await readStoredProof(latest?.storagePath)
      let fileName = manuscript.proofFileName || latest?.fileName || 'proof.pdf'
      let mimeType = latest?.mimeType || 'application/pdf'
      let payload = stored?.data ?? null

      if (!payload || !isPdfBuffer(payload)) {
        payload = buildFallbackPdf({
          manuscriptNumber: manuscript.number,
          title: manuscript.title,
          fileName,
          round: manuscript.proofRound ?? 1,
        })
        mimeType = 'application/pdf'
        if (!fileName.toLowerCase().endsWith('.pdf')) {
          fileName = `${fileName}.pdf`
        }
      }

      const safeName = fileName.replace(/"/g, '')
      res.setHeader('Content-Type', mimeType)
      res.setHeader('Content-Length', String(payload.length))
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
      )
      res.end(payload)
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to download proof',
      })
    }
  },
)

router.post(
  '/:id/production/proof-response',
  requireAuth,
  requireRole('author'),
  async (req: AuthedRequest, res) => {
    try {
      const key = String(req.params.id)
      const action = String(req.body?.action ?? '')
      const corrections = String(req.body?.corrections ?? '').trim()

      const existing = await prisma.manuscript.findFirst({
        where: {
          OR: [{ number: key }, { id: key }],
          submittingAuthorId: req.user!.id,
        },
      })
      if (!existing) {
        res.status(404).json({ ok: false, error: 'Manuscript not found.' })
        return
      }
      if (existing.status !== 'proof_sent') {
        res.status(400).json({
          ok: false,
          error: 'No proof is awaiting approval.',
        })
        return
      }

      if (action === 'corrections') {
        if (!corrections) {
          res.status(400).json({
            ok: false,
            error: 'Please list the requested corrections.',
          })
          return
        }
        const manuscript = await prisma.manuscript.update({
          where: { id: existing.id },
          data: {
            status: 'in_production',
            proofCorrections: corrections,
            activities: {
              create: {
                actorId: req.user!.id,
                label: 'Proof corrections requested',
                detail: corrections,
              },
            },
          },
          include: manuscriptInclude,
        })
        res.json({ ok: true, manuscript: toClientManuscript(manuscript) })
        return
      }

      if (action !== 'approve') {
        res.status(400).json({
          ok: false,
          error: 'Action must be approve or corrections.',
        })
        return
      }

      const manuscript = await prisma.manuscript.update({
        where: { id: existing.id },
        data: {
          status: 'ready_for_publication',
          proofCorrections: null,
          activities: {
            create: {
              actorId: req.user!.id,
              label: 'Proof approved',
              detail: 'Author approved the proof. Ready for publication.',
            },
          },
        },
        include: manuscriptInclude,
      })

      res.json({ ok: true, manuscript: toClientManuscript(manuscript) })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error:
          error instanceof Error ? error.message : 'Failed to respond to proof',
      })
    }
  },
)

router.post(
  '/:id/production/publish',
  requireAuth,
  requireRole('production', 'admin', 'journal_manager', 'editor'),
  async (req: AuthedRequest, res) => {
    try {
      const key = String(req.params.id)
      const doi = String(req.body?.doi ?? '').trim()
      const volume = String(req.body?.volume ?? '').trim()
      const issue = String(req.body?.issue ?? '').trim()
      const existing = await findManuscriptByKey(key)

      if (!existing) {
        res.status(404).json({ ok: false, error: 'Manuscript not found.' })
        return
      }
      if (existing.status !== 'ready_for_publication') {
        res.status(400).json({
          ok: false,
          error: 'Publish after the author approves the proof.',
        })
        return
      }
      if (!doi) {
        res.status(400).json({ ok: false, error: 'Please enter a DOI.' })
        return
      }

      const manuscript = await prisma.manuscript.update({
        where: { id: existing.id },
        data: {
          status: 'published',
          doi,
          volume: volume || existing.volume,
          issue: issue || existing.issue,
          portalSyncStatus: 'synced',
          portalSyncedAt: new Date(),
          activities: {
            create: {
              actorId: req.user!.id,
              label: 'Article published',
              detail: `Published with DOI ${doi}. Portal sync succeeded.`,
            },
          },
        },
        include: manuscriptInclude,
      })

      notifyAuthorPublished({
        manuscriptId: manuscript.id,
        number: manuscript.number,
        title: manuscript.title,
        journalName: manuscript.journal?.name,
        doi,
      })

      res.json({ ok: true, manuscript: toClientManuscript(manuscript) })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to publish',
      })
    }
  },
)

router.post(
  '/:id/production/portal-sync',
  requireAuth,
  requireRole('production', 'admin', 'journal_manager', 'editor'),
  async (req: AuthedRequest, res) => {
    try {
      const key = String(req.params.id)
      const existing = await findManuscriptByKey(key)
      if (!existing) {
        res.status(404).json({ ok: false, error: 'Manuscript not found.' })
        return
      }
      if (existing.status !== 'published' || !existing.doi) {
        res.status(400).json({
          ok: false,
          error: 'Only published articles with a DOI can sync to Portal.',
        })
        return
      }

      const manuscript = await prisma.manuscript.update({
        where: { id: existing.id },
        data: {
          portalSyncStatus: 'synced',
          portalSyncedAt: new Date(),
          activities: {
            create: {
              actorId: req.user!.id,
              label: 'Portal re-sync',
              detail: `Metadata re-synced for DOI ${existing.doi}.`,
            },
          },
        },
        include: manuscriptInclude,
      })

      res.json({ ok: true, manuscript: toClientManuscript(manuscript) })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Portal sync failed',
      })
    }
  },
)

export default router
