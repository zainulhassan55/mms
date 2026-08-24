import { PrismaClient } from '@prisma/client'

const p = new PrismaClient()

async function main() {
  const ms = await p.manuscript.findFirst({
    where: { number: 'MS-2026-0001' },
    include: {
      reviews: { select: { id: true, recommendation: true, reviewer: { select: { email: true } } } },
      invitations: {
        select: {
          status: true,
          reviewer: { select: { email: true } },
          review: { select: { id: true } },
        },
      },
      decisions: true,
    },
  })
  console.log(JSON.stringify(ms, null, 2))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => p.$disconnect())
