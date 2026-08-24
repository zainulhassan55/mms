import { PrismaClient } from '@prisma/client'

const p = new PrismaClient()

async function main() {
  const mss = await p.manuscript.findMany({
    select: {
      number: true,
      status: true,
      title: true,
      decision: true,
      assignedEditor: { select: { email: true } },
      submittingAuthor: { select: { email: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })
  console.log(JSON.stringify(mss, null, 2))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => p.$disconnect())
