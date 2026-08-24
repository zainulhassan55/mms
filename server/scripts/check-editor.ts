import { PrismaClient } from '@prisma/client'

const p = new PrismaClient()

async function main() {
  const editors = await p.user.findMany({
    where: { role: 'editor' },
    select: { id: true, email: true, name: true },
    orderBy: { email: 'asc' },
  })
  const mss = await p.manuscript.findMany({
    select: {
      number: true,
      status: true,
      title: true,
      assignedEditorId: true,
      assignedEditor: { select: { email: true, name: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })
  console.log('EDITORS', JSON.stringify(editors, null, 2))
  console.log('MANUSCRIPTS', JSON.stringify(mss, null, 2))
}

main()
  .catch(console.error)
  .finally(() => p.$disconnect())
