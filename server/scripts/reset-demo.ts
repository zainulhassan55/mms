import { PrismaClient } from '@prisma/client'
import fs from 'node:fs/promises'
import path from 'node:path'

const prisma = new PrismaClient()

async function wipeUploads() {
  const root = path.join(process.cwd(), 'uploads')
  try {
    await fs.rm(root, { recursive: true, force: true })
    console.log('Cleared uploads folder')
  } catch {
    console.log('No uploads folder to clear')
  }
}

async function main() {
  const counts = await prisma.$transaction([
    prisma.portalSyncEvent.deleteMany(),
    prisma.reviewReport.deleteMany(),
    prisma.reviewInvitation.deleteMany(),
    prisma.editorialDecision.deleteMany(),
    prisma.manuscriptFile.deleteMany(),
    prisma.manuscriptAuthor.deleteMany(),
    prisma.activityEvent.deleteMany(),
    prisma.manuscript.deleteMany(),
  ])

  await wipeUploads()

  console.log('Cleared:', {
    portalSync: counts[0].count,
    reviews: counts[1].count,
    invitations: counts[2].count,
    decisions: counts[3].count,
    files: counts[4].count,
    authors: counts[5].count,
    activity: counts[6].count,
    manuscripts: counts[7].count,
  })
  console.log('Users + journals kept. Ready for a new submission.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
