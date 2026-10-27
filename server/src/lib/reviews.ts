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
    files?: Array<{
      id: string
      kind: string
      fileName: string
      sizeBytes: number | null
    }>
  }
  review?: Pick<ReviewReport, 'id' | 'recommendation' | 'commentsToEditor'> | null
}

/** File kinds reviewers may download (blind review — no author identity files). */
export const reviewerFileKinds = new Set([
  'manuscript',
  'figures',
  'figure',
  'supplementary',
  'revision',
  'review_copy',
])

/** Prefer anonymized review copies when present; otherwise manuscript/revision files. */
export function filesVisibleToReviewer(
  files: Array<{
    id: string
    kind: string
    fileName: string
    sizeBytes: number | null
    visibility?: string | null
  }>,
) {
  const reviewCopies = files.filter(
    (f) => f.kind === 'review_copy' || f.visibility === 'review',
  )
  const source = reviewCopies.length > 0 ? reviewCopies : files
  return source
    .filter(
      (file) =>
        reviewerFileKinds.has(file.kind) &&
        file.visibility !== 'staff' &&
        file.kind !== 'cover_letter' &&
        file.kind !== 'identity',
    )
    .map((file) => ({
      id: file.id,
      kind: file.kind,
      fileName: file.fileName,
      sizeBytes: file.sizeBytes,
    }))
}

export function toClientInvitation(item: InvitationWithRelations) {
  const files = filesVisibleToReviewer(
    (item.manuscript?.files ?? []).map((file) => ({
      ...file,
      visibility: (file as { visibility?: string }).visibility,
    })),
  )

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
    files,
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

/**
 * Authors see reviewer reports only after the Editor in Chief has released a
 * final decision for that round (never while reports are still with editors/EIC).
 */
export function authorMaySeeReviews(status: string) {
  return [
    'revision_requested',
    'rejected',
    'accepted',
    'copyediting',
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
