import { Router } from 'express'
import type { ReviewRecommendation } from '@prisma/client'
import { prisma } from '../db.js'
import { requireAuth, type AuthedRequest } from '../auth/middleware.js'
import { requireRole } from '../auth/requireRole.js'
import {
  invitationInclude,
  toClientInvitation,
  toClientReview,
} from '../lib/reviews.js'

const router = Router()

const recommendations = new Set<ReviewRecommendation>([
  'accept',
  'minor_revision',
  'major_revision',
  'reject',
])

const invitationManuscriptSelect = {
  id: true,
  number: true,
  title: true,
  journal: { select: { name: true } },
} as const

function scoreValue(raw: unknown, label: string) {
  const value = Number(raw)
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    throw new Error(`${label} must be an integer from 1 to 5.`)
  }
  return value
}

router.get(
  '/',
  requireAuth,
  requireRole('reviewer'),
  async (req: AuthedRequest, res) => {
    try {
      const status = String(req.query.status ?? '')
      const invitations = await prisma.reviewInvitation.findMany({
        where: {
          reviewerId: req.user!.id,
          ...(status === 'sent' || status === 'accepted' || status === 'declined'
            ? { status }
            : {}),
        },
        include: {
          ...invitationInclude,
          manuscript: { select: invitationManuscriptSelect },
        },
        orderBy: { invitedAt: 'desc' },
      })

      res.json({
        ok: true,
        invitations: invitations.map(toClientInvitation),
      })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to load invitations',
      })
    }
  },
)

router.get(
  '/reviews',
  requireAuth,
  requireRole('reviewer'),
  async (req: AuthedRequest, res) => {
    try {
      const reviews = await prisma.reviewReport.findMany({
        where: { reviewerId: req.user!.id },
        include: {
          reviewer: { select: { name: true } },
          manuscript: {
            select: {
              number: true,
              title: true,
              journal: { select: { name: true } },
            },
          },
          invitation: { select: { deadline: true, round: true } },
        },
        orderBy: { submittedAt: 'desc' },
      })

      res.json({
        ok: true,
        reviews: reviews.map((item) => ({
          ...toClientReview(item),
          manuscriptId: item.manuscript.number,
          manuscriptTitle: item.manuscript.title,
          journal: item.manuscript.journal.name,
          deadline: item.invitation.deadline.toISOString().slice(0, 10),
          round: item.invitation.round,
        })),
      })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to load reviews',
      })
    }
  },
)

router.get(
  '/:id',
  requireAuth,
  requireRole('reviewer'),
  async (req: AuthedRequest, res) => {
    try {
      const id = String(req.params.id)
      const invitation = await prisma.reviewInvitation.findFirst({
        where: { id, reviewerId: req.user!.id },
        include: {
          ...invitationInclude,
          manuscript: { select: invitationManuscriptSelect },
        },
      })

      if (!invitation) {
        res.status(404).json({ ok: false, error: 'Invitation not found.' })
        return
      }

      res.json({ ok: true, invitation: toClientInvitation(invitation) })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to load invitation',
      })
    }
  },
)

router.post(
  '/:id/respond',
  requireAuth,
  requireRole('reviewer'),
  async (req: AuthedRequest, res) => {
    try {
      const id = String(req.params.id)
      const response = String(req.body?.response ?? '')
      const declineReason = String(req.body?.declineReason ?? '').trim()

      if (response !== 'accepted' && response !== 'declined') {
        res.status(400).json({
          ok: false,
          error: 'Response must be accepted or declined.',
        })
        return
      }

      const invitation = await prisma.reviewInvitation.findFirst({
        where: { id, reviewerId: req.user!.id },
        include: {
          manuscript: { select: { id: true, number: true, title: true } },
          reviewer: { select: { name: true } },
        },
      })

      if (!invitation) {
        res.status(404).json({ ok: false, error: 'Invitation not found.' })
        return
      }
      if (invitation.status !== 'sent') {
        res.status(400).json({
          ok: false,
          error: 'This invitation was already answered.',
        })
        return
      }

      const updated = await prisma.reviewInvitation.update({
        where: { id: invitation.id },
        data: {
          status: response,
          declineReason: response === 'declined' ? declineReason || null : null,
        },
        include: {
          ...invitationInclude,
          manuscript: { select: invitationManuscriptSelect },
        },
      })

      await prisma.activityEvent.create({
        data: {
          manuscriptId: invitation.manuscriptId,
          actorId: req.user!.id,
          label:
            response === 'accepted'
              ? 'Review invitation accepted'
              : 'Review invitation declined',
          detail:
            response === 'accepted'
              ? `${invitation.reviewer.name} accepted the review.`
              : `${invitation.reviewer.name} declined${declineReason ? `: ${declineReason}` : '.'}`,
        },
      })

      res.json({ ok: true, invitation: toClientInvitation(updated) })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to respond',
      })
    }
  },
)

router.post(
  '/:id/review',
  requireAuth,
  requireRole('reviewer'),
  async (req: AuthedRequest, res) => {
    try {
      const id = String(req.params.id)
      const summary = String(req.body?.summary ?? '').trim()
      const strengths = String(req.body?.strengths ?? '').trim()
      const weaknesses = String(req.body?.weaknesses ?? '').trim()
      const commentsToAuthor = String(req.body?.commentsToAuthor ?? '').trim()
      const commentsToEditor = String(req.body?.commentsToEditor ?? '').trim()
      const recommendation = String(
        req.body?.recommendation ?? '',
      ) as ReviewRecommendation

      if (!summary || !strengths || !weaknesses || !commentsToAuthor) {
        res.status(400).json({
          ok: false,
          error: 'Please complete all required review fields.',
        })
        return
      }

      if (!recommendations.has(recommendation)) {
        res.status(400).json({
          ok: false,
          error: 'Invalid recommendation.',
        })
        return
      }

      let originality: number
      let methodology: number
      let clarity: number
      try {
        originality = scoreValue(req.body?.originality, 'Originality')
        methodology = scoreValue(req.body?.methodology, 'Methodology')
        clarity = scoreValue(req.body?.clarity, 'Clarity')
      } catch (scoreError) {
        res.status(400).json({
          ok: false,
          error:
            scoreError instanceof Error
              ? scoreError.message
              : 'Invalid score values.',
        })
        return
      }

      const invitation = await prisma.reviewInvitation.findFirst({
        where: { id, reviewerId: req.user!.id },
        include: {
          review: { select: { id: true } },
          reviewer: { select: { name: true } },
          manuscript: {
            select: { id: true, number: true, status: true, title: true },
          },
        },
      })

      if (!invitation) {
        res.status(404).json({ ok: false, error: 'Invitation not found.' })
        return
      }

      if (invitation.status !== 'accepted') {
        res.status(400).json({
          ok: false,
          error: 'Accept the invitation before submitting a review.',
        })
        return
      }

      if (invitation.review) {
        res.status(400).json({
          ok: false,
          error: 'A review was already submitted for this invitation.',
        })
        return
      }

      if (
        invitation.manuscript.status !== 'under_review' &&
        invitation.manuscript.status !== 'revision_requested'
      ) {
        res.status(400).json({
          ok: false,
          error: 'This manuscript is no longer open for review.',
        })
        return
      }

      const review = await prisma.reviewReport.create({
        data: {
          invitationId: invitation.id,
          manuscriptId: invitation.manuscriptId,
          reviewerId: req.user!.id,
          summary,
          strengths,
          weaknesses,
          commentsToAuthor,
          commentsToEditor,
          recommendation,
          originality,
          methodology,
          clarity,
        },
        include: {
          reviewer: { select: { name: true } },
        },
      })

      await prisma.activityEvent.create({
        data: {
          manuscriptId: invitation.manuscriptId,
          actorId: req.user!.id,
          label: 'Review submitted',
          detail: `${invitation.reviewer.name} submitted a review (${recommendation.replace(/_/g, ' ')}).`,
        },
      })

      res.status(201).json({
        ok: true,
        review: {
          ...toClientReview(review),
          manuscriptId: invitation.manuscript.number,
          manuscriptTitle: invitation.manuscript.title,
        },
      })
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to submit review',
      })
    }
  },
)

export default router
