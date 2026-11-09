/**
 * Wipe all journals, manuscripts, requests, and users except the super admin
 * (ADMIN_EMAIL from server/.env).
 *
 * Usage (from server/):
 *   node --env-file=.env scripts/wipe-except-admin.mjs
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').trim().toLowerCase()

if (!ADMIN_EMAIL || !ADMIN_EMAIL.includes('@')) {
  console.error('Set ADMIN_EMAIL in server/.env before wiping.')
  process.exit(1)
}

async function main() {
  console.log(`Keeping super admin: ${ADMIN_EMAIL}`)

  await prisma.$transaction([
    prisma.doiDeposit.deleteMany(),
    prisma.discussionPost.deleteMany(),
    prisma.discussionThread.deleteMany(),
    prisma.galley.deleteMany(),
    prisma.copyeditAssignment.deleteMany(),
    prisma.portalSyncEvent.deleteMany(),
    prisma.reviewReport.deleteMany(),
    prisma.reviewInvitation.deleteMany(),
    prisma.editorRecommendation.deleteMany(),
    prisma.editorialDecision.deleteMany(),
    prisma.manuscriptFile.deleteMany(),
    prisma.reviewRound.deleteMany(),
    prisma.manuscriptAuthor.deleteMany(),
    prisma.activityEvent.deleteMany(),
    prisma.manuscript.deleteMany(),
    prisma.issue.deleteMany(),
    prisma.emailTemplate.deleteMany(),
    prisma.journalSection.deleteMany(),
    prisma.journalMembership.deleteMany(),
    prisma.journalRequest.deleteMany(),
    prisma.journal.deleteMany(),
  ])

  const removedUsers = await prisma.user.deleteMany({
    where: { email: { not: ADMIN_EMAIL } },
  })

  const admin = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
    select: { id: true, email: true, role: true, name: true },
  })

  if (!admin) {
    console.error(
      `No user found for ADMIN_EMAIL=${ADMIN_EMAIL}. Create/seed admin first.`,
    )
    process.exit(1)
  }

  if (admin.role !== 'admin') {
    await prisma.user.update({
      where: { id: admin.id },
      data: { role: 'admin' },
    })
    console.log('Forced role=admin on retained account.')
  }

  const journals = await prisma.journal.count()
  const users = await prisma.user.count()

  console.log(
    JSON.stringify(
      {
        ok: true,
        keptAdmin: admin,
        removedOtherUsers: removedUsers.count,
        journalsLeft: journals,
        usersLeft: users,
      },
      null,
      2,
    ),
  )
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
