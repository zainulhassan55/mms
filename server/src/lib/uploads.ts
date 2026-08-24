import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
export const uploadsRoot = path.join(rootDir, 'uploads', 'proofs')

function safeFileName(name: string) {
  const base = path.basename(name).replace(/[^a-zA-Z0-9._-]+/g, '_')
  return base.slice(0, 120) || 'proof.pdf'
}

export async function ensureUploadsDir() {
  await fs.mkdir(uploadsRoot, { recursive: true })
}

export async function saveProofBuffer(input: {
  manuscriptId: string
  round: number
  fileName: string
  buffer: Buffer
}) {
  await ensureUploadsDir()
  if (input.buffer.length === 0) {
    throw new Error('Proof file is empty.')
  }
  if (input.buffer.length > 12 * 1024 * 1024) {
    throw new Error('Proof file is too large (max 12 MB).')
  }

  const safe = safeFileName(input.fileName)
  const storedName = `${input.manuscriptId}-r${input.round}-${Date.now()}-${safe}`
  const absolutePath = path.join(uploadsRoot, storedName)
  await fs.writeFile(absolutePath, input.buffer)

  return {
    absolutePath,
    relativePath: storedName,
    sizeBytes: input.buffer.length,
    fileName: safe,
  }
}

/** Decode base64 proof payloads (legacy JSON upload path). */
export async function saveProofFile(input: {
  manuscriptId: string
  round: number
  fileName: string
  base64: string
}) {
  const cleaned = input.base64
    .replace(/^data:[^;]+;base64,/i, '')
    .replace(/\s+/g, '')
  const buffer = Buffer.from(cleaned, 'base64')
  return saveProofBuffer({
    manuscriptId: input.manuscriptId,
    round: input.round,
    fileName: input.fileName,
    buffer,
  })
}

export async function readStoredProof(relativePath: string | null | undefined) {
  if (!relativePath) return null
  const absolutePath = path.isAbsolute(relativePath)
    ? relativePath
    : path.join(uploadsRoot, path.basename(relativePath))
  try {
    const data = await fs.readFile(absolutePath)
    return { absolutePath, data }
  } catch {
    return null
  }
}

/** Minimal valid PDF so fallback downloads still open in PDF readers. */
export function buildFallbackPdf(input: {
  manuscriptNumber: string
  title: string
  fileName: string
  round: number
}) {
  const escapePdf = (value: string) =>
    value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')

  const lines = [
    `MMS proof package`,
    `Manuscript: ${input.manuscriptNumber}`,
    `Title: ${input.title}`,
    `File: ${input.fileName}`,
    `Round: ${input.round}`,
    `Re-send the proof from Production to attach the original PDF.`,
  ].map(escapePdf)

  const content =
    `BT /F1 11 Tf 50 760 Td 14 TL ${lines
      .map((line, index) => (index === 0 ? `(${line}) Tj` : `T* (${line}) Tj`))
      .join(' ')} ET`

  const objects = [
    '1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n',
    '2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n',
    '3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj\n',
    `4 0 obj<< /Length ${Buffer.byteLength(content, 'utf8')} >>stream\n${content}\nendstream\nendobj\n`,
    '5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n',
  ]

  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'))
    pdf += object
  }
  const xrefStart = Buffer.byteLength(pdf, 'utf8')
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`
  return Buffer.from(pdf, 'utf8')
}

export function isPdfBuffer(data: Buffer) {
  return data.subarray(0, 4).toString('utf8') === '%PDF'
}

export async function saveSubmissionBuffer(input: {
  manuscriptId: string
  kind: string
  fileName: string
  buffer: Buffer
}) {
  const dir = path.join(rootDir, 'uploads', 'submissions')
  await fs.mkdir(dir, { recursive: true })
  if (input.buffer.length === 0) {
    throw new Error('Uploaded file is empty.')
  }
  if (input.buffer.length > 12 * 1024 * 1024) {
    throw new Error('Uploaded file is too large (max 12 MB).')
  }

  const safe = safeFileName(input.fileName)
  const storedName = `${input.manuscriptId}-${input.kind}-${Date.now()}-${safe}`
  const absolutePath = path.join(dir, storedName)
  await fs.writeFile(absolutePath, input.buffer)

  return {
    absolutePath,
    relativePath: storedName,
    sizeBytes: input.buffer.length,
    fileName: safe,
  }
}

export async function readStoredSubmission(
  relativePath: string | null | undefined,
) {
  if (!relativePath) return null
  const absolutePath = path.isAbsolute(relativePath)
    ? relativePath
    : path.join(rootDir, 'uploads', 'submissions', path.basename(relativePath))
  try {
    const data = await fs.readFile(absolutePath)
    return { absolutePath, data }
  } catch {
    return null
  }
}

export async function saveRevisionBuffer(input: {
  manuscriptId: string
  version: number
  fileName: string
  buffer: Buffer
}) {
  const dir = path.join(rootDir, 'uploads', 'revisions')
  await fs.mkdir(dir, { recursive: true })
  if (input.buffer.length === 0) {
    throw new Error('Revision file is empty.')
  }
  if (input.buffer.length > 12 * 1024 * 1024) {
    throw new Error('Revision file is too large (max 12 MB).')
  }

  const safe = safeFileName(input.fileName)
  const storedName = `${input.manuscriptId}-v${input.version}-${Date.now()}-${safe}`
  const absolutePath = path.join(dir, storedName)
  await fs.writeFile(absolutePath, input.buffer)

  return {
    absolutePath,
    relativePath: storedName,
    sizeBytes: input.buffer.length,
    fileName: safe,
  }
}
