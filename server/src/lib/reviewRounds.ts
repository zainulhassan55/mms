import { prisma } from '../db.js'

/** Ensure an open ReviewRound exists; create round 1 if needed. */
export async function ensureOpenReviewRound(
  manuscriptId: string,
  roundNumber?: number,
) {
  const existing = await prisma.reviewRound.findFirst({
    where: { manuscriptId, status: 'open' },
    orderBy: { roundNumber: 'desc' },
  })
  if (existing) return existing

  const latest = await prisma.reviewRound.findFirst({
    where: { manuscriptId },
    orderBy: { roundNumber: 'desc' },
  })
  const next = roundNumber ?? (latest ? latest.roundNumber + 1 : 1)
  return prisma.reviewRound.create({
    data: { manuscriptId, roundNumber: next, status: 'open' },
  })
}
