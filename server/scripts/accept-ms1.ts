import { PrismaClient } from '@prisma/client'

const p = new PrismaClient()

async function main() {
  const manuscript = await p.manuscript.findFirst({
    where: { number: 'MS-2026-0001' },
  })
  if (!manuscript) throw new Error('Manuscript not found')
  if (manuscript.status === 'accepted' || manuscript.status === 'in_production') {
    console.log('Already past accept:', manuscript.status)
    return
  }

  const editor = await p.user.findUnique({
    where: { email: 'e.vargas@publisher.example' },
  })
  if (!editor) throw new Error('Editor missing')

  const letter =
    'Based on the peer review report, we are pleased to accept this manuscript for publication.'

  await p.$transaction(async (tx) => {
    await tx.editorialDecision.create({
      data: {
        manuscriptId: manuscript.id,
        decidedById: editor.id,
        decision: 'accept',
        letter,
        round: manuscript.version,
      },
    })
    await tx.manuscript.update({
      where: { id: manuscript.id },
      data: {
        status: 'accepted',
        decision: 'accept',
        decisionLetter: letter,
        decisionAt: new Date(),
        activities: {
          create: {
            actorId: editor.id,
            label: 'Editorial decision recorded',
            detail: `accept — ${letter.slice(0, 120)}`,
          },
        },
      },
    })
  })

  console.log('MS-2026-0001 marked accepted for production.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => p.$disconnect())
