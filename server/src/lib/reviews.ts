import type {
  InvitationStatus,
  ReviewInvitation,
  ReviewRecommendation,
  ReviewReport,
  User,
  Manuscript,
  Journal,
} from '@prisma/client'

function dateLabel(value: Date | null | undefined) {
  if (!value) return undefined
  return value.toISOString().slice(0, 10)
}

export type InvitationWithRelations = ReviewInvitation & {
  reviewer: Pick<User, 'id' | 'name' | 'email' | 'affiliation' | 'expertise'>
  manuscript?: Pick<Manuscript, 'id' | 'number' | 'title'> & {
    journal?: Pick<Journal, 'name'>
  }
  review?: Pick<ReviewReport, 'id' | 'recommendation' | 'commentsToEditor'> | null
}

export function toClientInvitation(item: InvitationWithRelations) {
  return {
    id: item.id,
    manuscriptId: item.manuscript?.number ?? item.manuscriptId,
    manuscriptDbId: item.manuscriptId,
    manuscriptTitle: item.manuscript?.title,
    journal: item.manuscript?.journal?.name,
    reviewerId: item.reviewerId,
    reviewerName: item.reviewer.name,
    reviewerEmail: item.reviewer.email,
    status: item.status as InvitationStatus,
    invitedAt: dateLabel(item.invitedAt)!,
    deadline: dateLabel(item.deadline)!,
    declineReason: item.declineReason ?? undefined,
    round: item.round,
    review: item.review
      ? {
          id: item.review.id,
          recommendation: item.review.recommendation as ReviewRecommendation,
          commentsToEditor: item.review.commentsToEditor,
        }
      : null,
  }
}

export function toClientReview(
  item: ReviewReport & {
    reviewer?: Pick<User, 'name'>
  },
  options?: { forAuthor?: boolean; reviewerLabel?: string },
) {
  const forAuthor = Boolean(options?.forAuthor)
  return {
    id: item.id,
    invitationId: item.invitationId,
    manuscriptId: item.manuscriptId,
    reviewerName: forAuthor
      ? (options?.reviewerLabel ?? 'Reviewer')
      : (item.reviewer?.name ?? 'Reviewer'),
    summary: item.summary,
    strengths: item.strengths,
    weaknesses: item.weaknesses,
    commentsToAuthor: item.commentsToAuthor,
    // Confidential — never expose to authors
    commentsToEditor: forAuthor ? '' : item.commentsToEditor,
    recommendation: item.recommendation,
    originality: forAuthor ? undefined : (item.originality ?? undefined),
    methodology: forAuthor ? undefined : (item.methodology ?? undefined),
    clarity: forAuthor ? undefined : (item.clarity ?? undefined),
    submittedAt: dateLabel(item.submittedAt)!,
  }
}

/** Authors see reports only after an editorial decision that shares feedback. */
export function authorMaySeeReviews(status: string) {
  return [
    'revision_requested',
    'rejected',
    'accepted',
    'in_production',
    'proof_sent',
    'ready_for_publication',
    'published',
  ].includes(status)
}

export const invitationInclude = {
  reviewer: {
    select: {
      id: true,
      name: true,
      email: true,
      affiliation: true,
      expertise: true,
    },
  },
  review: {
    select: {
      id: true,
      recommendation: true,
      commentsToEditor: true,
    },
  },
} as const
