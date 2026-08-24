import type { AuthUser } from '../../auth/AuthContext'

export type SubmissionAuthor = {
  id: string
  name: string
  email: string
  affiliation: string
  corresponding: boolean
}

export type UploadedFile = {
  id: string
  name: string
  sizeLabel: string
  file: File
}

export type SubmissionDraft = {
  journalId: string
  specialIssueId: string
  articleType: string
  title: string
  abstract: string
  keywords: string
  authors: SubmissionAuthor[]
  coverLetter: string
  manuscriptFile: UploadedFile | null
  figureFiles: UploadedFile[]
  supplementaryFiles: UploadedFile[]
  conflictOfInterest: boolean
  conflictDetails: string
  fundingStatement: string
  dataAvailability: string
  ethicsApproval: boolean
  ethicsDetails: string
}

export const wizardSteps = [
  { id: 'journal', label: 'Journal' },
  { id: 'details', label: 'Details' },
  { id: 'authors', label: 'Authors' },
  { id: 'files', label: 'Files' },
  { id: 'ethics', label: 'Ethics' },
  { id: 'review', label: 'Review' },
] as const

export type WizardStepId = (typeof wizardSteps)[number]['id']

export function createInitialDraft(
  user?: Pick<AuthUser, 'name' | 'email' | 'affiliation'>,
): SubmissionDraft {
  return {
    journalId: 'jces',
    specialIssueId: 'none',
    articleType: 'Research',
    title: '',
    abstract: '',
    keywords: '',
    authors: [
      {
        id: 'author-1',
        name: user?.name ?? '',
        email: user?.email ?? '',
        affiliation: user?.affiliation ?? '',
        corresponding: true,
      },
    ],
    coverLetter: '',
    manuscriptFile: null,
    figureFiles: [],
    supplementaryFiles: [],
    conflictOfInterest: false,
    conflictDetails: '',
    fundingStatement: '',
    dataAvailability: '',
    ethicsApproval: false,
    ethicsDetails: '',
  }
}

export function formatAuthors(authors: SubmissionAuthor[]) {
  return authors
    .map((author) => {
      const parts = author.name.trim().split(/\s+/)
      if (parts.length === 1) return parts[0]
      const last = parts[parts.length - 1]
      const initials = parts
        .slice(0, -1)
        .map((part) => `${part[0]}.`)
        .join(' ')
      return `${initials} ${last}`
    })
    .join(', ')
}

export function wrapUploadedFile(file: File): UploadedFile {
  const mb = file.size / (1024 * 1024)
  return {
    id: `${file.name}-${file.size}-${Date.now()}`,
    name: file.name,
    sizeLabel:
      mb >= 0.1
        ? `${mb.toFixed(1)} MB`
        : `${Math.max(1, Math.round(file.size / 1024))} KB`,
    file,
  }
}
