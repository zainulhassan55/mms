import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/auth/password.js'

const prisma = new PrismaClient()

/** Bootstrap admin only — everyone else self-registers. */
const ADMIN_EMAIL = 'admin@publisher.example'
const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD || 'admin123'

async function main() {
  const passwordHash = await hashPassword(ADMIN_PASSWORD)

  const journals = [
    {
      code: 'jces',
      name: 'Journal of Computational Earth Systems',
      issn: '2789-1044',
      description:
        'Computational methods for earth, climate, and environmental systems.',
    },
    {
      code: 'aiee',
      name: 'Advances in Intelligent Engineering',
      issn: '2666-2213',
      description: 'Applied AI, sensing, and engineering systems research.',
    },
  ]

  for (const journal of journals) {
    await prisma.journal.upsert({
      where: { code: journal.code },
      update: {
        name: journal.name,
        issn: journal.issn,
        description: journal.description,
      },
      create: journal,
    })
  }

  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      name: 'Publisher Admin',
      initials: 'PA',
      role: 'admin',
      affiliation: 'Publisher Operations',
      passwordHash,
    },
    create: {
      email: ADMIN_EMAIL,
      name: 'Publisher Admin',
      initials: 'PA',
      role: 'admin',
      affiliation: 'Publisher Operations',
      passwordHash,
    },
  })

  // Clear workflow data so legacy demo users can be removed cleanly
  await prisma.$transaction([
    prisma.portalSyncEvent.deleteMany(),
    prisma.reviewReport.deleteMany(),
    prisma.reviewInvitation.deleteMany(),
    prisma.editorialDecision.deleteMany(),
    prisma.manuscriptFile.deleteMany(),
    prisma.manuscriptAuthor.deleteMany(),
    prisma.activityEvent.deleteMany(),
    prisma.manuscript.deleteMany(),
  ])

  // Remove legacy demo accounts from earlier builds
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [
          'amina.rahman@example.edu',
          'office@publisher.example',
          'e.vargas@publisher.example',
          'm.lin@publisher.example',
          'samira.khan@example.edu',
          'nils.berg@example.edu',
          'production@publisher.example',
          'office@ccri.example',
          'elena.vargas@example.edu',
          'production@ccri.example',
          'admin@ccri.example',
        ],
      },
    },
  })

  // Collapse legacy Editorial Office accounts into Editor
  await prisma.user.updateMany({
    where: { role: 'office' },
    data: { role: 'editor' },
  })

  console.log('Seed complete: journals + bootstrap admin')
  console.log(`Admin login: ${ADMIN_EMAIL}`)
  console.log(`Admin password: ${ADMIN_PASSWORD}`)
  console.log('All other roles must register via /register (office role removed — use Editor)')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
