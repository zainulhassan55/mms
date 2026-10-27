import type { AuthUser } from '../../auth/AuthContext'

export type SubmissionAuthor = {
  id: string
  name: string
  email: string
  affiliation: string
  country: string
  orcid: string
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
  sectionId: string
  specialIssueId: string
  articleType: string
  title: string
  abstract: string
  keywords: string
  /** OJS “Comments for the Editor” */
  commentsForEditor: string
  authors: SubmissionAuthor[]
  manuscriptFile: UploadedFile | null
  figureFiles: UploadedFile[]
  supplementaryFiles: UploadedFile[]
  conflictOfInterest: boolean
  conflictDetails: string
  fundingStatement: string
  dataAvailability: string
  ethicsApproval: boolean
  ethicsDetails: string
  /** OJS submission checklist */
  checklistOriginal: boolean
  checklistGuidelines: boolean
  checklistCopyright: boolean
}

/** Mirrors OJS 3.x submission wizard stages. */
export const wizardSteps = [
  { id: 'start', label: 'Start' },
  { id: 'metadata', label: 'Metadata' },
  { id: 'contributors', label: 'Contributors' },
  { id: 'files', label: 'Upload files' },
  { id: 'declarations', label: 'Declarations' },
  { id: 'review', label: 'Review' },
] as const

export type WizardStepId = (typeof wizardSteps)[number]['id']

export function createInitialDraft(
  user?: Pick<AuthUser, 'name' | 'email' | 'affiliation'>,
): SubmissionDraft {
  return {
    journalId: 'ijdh',
    sectionId: '',
    specialIssueId: 'none',
    articleType: 'Research Article',
    title: '',
    abstract: '',
    keywords: '',
    commentsForEditor: '',
    authors: [
      {
        id: 'author-1',
        name: user?.name ?? '',
        email: user?.email ?? '',
        affiliation: user?.affiliation ?? '',
        country: '',
        orcid: '',
        corresponding: true,
      },
    ],
    manuscriptFile: null,
    figureFiles: [],
    supplementaryFiles: [],
    conflictOfInterest: false,
    conflictDetails: '',
    fundingStatement: '',
    dataAvailability: '',
    ethicsApproval: false,
    ethicsDetails: '',
    checklistOriginal: false,
    checklistGuidelines: false,
    checklistCopyright: false,
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
