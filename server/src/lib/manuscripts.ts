import type {
  Manuscript,
  ManuscriptAuthor,
  ManuscriptFile,
  ManuscriptStatus,
  ActivityEvent,
  Journal,
  User,
} from '@prisma/client'

export type ManuscriptWithRelations = Manuscript & {
  journal: Journal
  submittingAuthor: Pick<User, 'id' | 'name' | 'email'>
  assignedEditor: Pick<User, 'id' | 'name' | 'email'> | null
  authors: ManuscriptAuthor[]
  files: ManuscriptFile[]
  activities?: ActivityEvent[]
}

function dateLabel(value: Date | null | undefined) {
  if (!value) return undefined
  return value.toISOString().slice(0, 10)
}

export function toClientManuscript(item: ManuscriptWithRelations) {
  return {
    id: item.number,
    dbId: item.id,
    title: item.title,
    abstract: item.abstract,
    keywords: item.keywords,
    journal: item.journal.name,
    journalCode: item.journal.code,
    articleType: item.articleType,
    specialIssue: item.specialIssue,
    status: item.status as ManuscriptStatus,
    updatedAt: dateLabel(item.updatedAt)!,
    submittedAt: dateLabel(item.submittedAt),
    version: item.version,
    authors: item.authorsText,
    authorList: item.authors.map((author) => ({
      id: author.id,
      name: author.name,
      email: author.email,
      affiliation: author.affiliation ?? '',
      corresponding: author.isCorresponding,
    })),
    files: item.files.map((file) => ({
      id: file.id,
      kind: file.kind,
      fileName: file.fileName,
      sizeBytes: file.sizeBytes,
      uploadedAt: dateLabel(file.uploadedAt),
    })),
    assignedEditor: item.assignedEditor?.name,
    officeNotes: item.officeNotes ?? undefined,
    rejectReason: item.rejectReason ?? undefined,
    decision: item.decision ?? undefined,
    decisionLetter: item.decisionLetter ?? undefined,
    decisionAt: dateLabel(item.decisionAt),
    revisionDueAt: dateLabel(item.revisionDueAt),
    lastResponseLetter: item.lastResponseLetter ?? undefined,
    doi: item.doi ?? undefined,
    proofFileName: item.proofFileName ?? undefined,
    proofRound: item.proofRound ?? undefined,
    proofCorrections: item.proofCorrections ?? undefined,
    productionNotes: item.productionNotes ?? undefined,
    portalSyncStatus: item.portalSyncStatus ?? undefined,
    portalSyncedAt: dateLabel(item.portalSyncedAt),
    volume: item.volume ?? undefined,
    issue: item.issue ?? undefined,
  }
}

export function toClientActivity(
  item: ActivityEvent & { manuscript?: { number: string } | null },
) {
  return {
    id: item.id,
    manuscriptId: item.manuscript?.number ?? item.manuscriptId ?? '',
    label: item.label,
    detail: item.detail,
    at: dateLabel(item.createdAt) ?? 'Just now',
  }
}

export async function nextManuscriptNumber(
  prisma: {
    manuscript: {
      findFirst: (args: {
        orderBy: { createdAt: 'desc' }
        select: { number: true }
      }) => Promise<{ number: string } | null>
    }
  },
) {
  const year = new Date().getFullYear()
  const prefix = `MS-${year}-`
  const latest = await prisma.manuscript.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { number: true },
  })

  let next = 1
  if (latest?.number.startsWith(prefix)) {
    const parsed = Number(latest.number.slice(prefix.length))
    if (!Number.isNaN(parsed)) next = parsed + 1
  }

  return `${prefix}${String(next).padStart(4, '0')}`
}

export const manuscriptInclude = {
  journal: true,
  submittingAuthor: { select: { id: true, name: true, email: true } },
  assignedEditor: { select: { id: true, name: true, email: true } },
  authors: { orderBy: { sortOrder: 'asc' as const } },
  files: true,
} as const
