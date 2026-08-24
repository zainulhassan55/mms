import { PrismaClient } from '@prisma/client'
import fs from 'node:fs'
import path from 'node:path'

const p = new PrismaClient()

async function main() {
  const m = await p.manuscript.findFirst({
    orderBy: { updatedAt: 'desc' },
    include: { files: { orderBy: { uploadedAt: 'desc' } } },
  })
  console.log(
    JSON.stringify(
      {
        number: m?.number,
        status: m?.status,
        proofFileName: m?.proofFileName,
        proofRound: m?.proofRound,
        files: m?.files,
      },
      null,
      2,
    ),
  )

  const uploads = path.join(process.cwd(), 'uploads', 'proofs')
  console.log('uploads dir exists', fs.existsSync(uploads), uploads)
  if (fs.existsSync(uploads)) {
    console.log('files', fs.readdirSync(uploads))
  }
}

main()
  .catch(console.error)
  .finally(() => p.$disconnect())
