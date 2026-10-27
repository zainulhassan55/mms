import type { ManuscriptStatus } from '../data/mock'
import { apiFetch, getApiBase, getToken } from './api'

export type ApiManuscript = {
  id: string
  dbId: string
  title: string
  abstract?: string | null
  keywords?: string | null
  journal: string
  journalCode: string
  journalId?: string
  sectionId?: string
  section?: { id: string; code: string; title: string }
  articleType: string
  specialIssue?: string | null
  status: ManuscriptStatus
  updatedAt: string
  submittedAt?: string
  version: number
  authors: string
  assignedEditor?: string
  assignedEditorId?: string
  commentsForEditor?: string
  fundingStatement?: string
  dataAvailability?: string
  competingInterests?: string
  ethicsNotes?: string
  officeNotes?: string
  authorList?: Array<{
    id: string
    name: string
    email: string
    affiliation: string
    orcid: string
    corresponding: boolean
  }>
  rejectReason?: string
  decision?: string
  decisionLetter?: string
  decisionAt?: string
  lastResponseLetter?: string | null
  revisionDueAt?: string
  doi?: string
  proofFileName?: string
  proofRound?: number
  proofCorrections?: string
  productionNotes?: string
  portalSyncStatus?: string
  volume?: string
  issue?: string
  issueId?: string
  reviewCount?: number
  openInviteCount?: number
  awaitingDecision?: boolean
  files?: Array<{
    id: string
    kind: string
    fileName: string
    sizeBytes?: number | null
    visibility?: string
  }>
  reviewRounds?: Array<{ id: string; roundNumber: number; status: string }>
  galleys?: Array<{
    id: string
    label: string
    format: string
    fileName: string
    isPrimary: boolean
  }>
}

export type ApiInvitation = {
  id: string
  manuscriptId: string
  manuscriptDbId: string
  manuscriptTitle?: string
  journal?: string
  reviewerId: string
  reviewerName: string
  reviewerEmail: string
  status: 'sent' | 'accepted' | 'declined' | 'overdue'
  invitedAt: string
  deadline: string
  declineReason?: string
  round: number
  files?: Array<{
    id: string
    kind: string
    fileName: string
    sizeBytes?: number | null
  }>
  review?: {
    id: string
    recommendation: string
    commentsToEditor: string
  } | null
}

export type ApiReview = {
  id: string
  invitationId: string
  manuscriptId: string
  manuscriptTitle?: string
  journal?: string
  deadline?: string
  round?: number
  reviewerName: string
  summary: string
  strengths: string
  weaknesses: string
  commentsToAuthor: string
  commentsToEditor: string
  recommendation: string
  originality?: number
  methodology?: number
  clarity?: number
  submittedAt: string
}

export type ApiEditorRecommendation = {
  id: string
  recommendation: string
  note: string
  round: number
  createdAt: string
  editorName: string
  editorId: string
}

export type ApiReviewer = {
  id: string
  name: string
  email: string
  affiliation: string | null
  expertise: string | null
}


export type ApiActivity = {
  id: string
  manuscriptId: string
  label: string
  detail: string
  at: string
}

export async function fetchMyManuscripts() {
  const data = await apiFetch<{ ok: boolean; manuscripts: ApiManuscript[] }>(
    '/api/manuscripts',
  )
  return data.manuscripts
}

export async function fetchProductionQueue() {
  const data = await apiFetch<{ ok: boolean; manuscripts: ApiManuscript[] }>(
    '/api/manuscripts/pipeline/production',
  )
  return data.manuscripts
}

export async function fetchMyActivity() {
  const data = await apiFetch<{ ok: boolean; activity: ApiActivity[] }>(
    '/api/manuscripts/activity',
  )
  return data.activity
}

export async function fetchManuscript(id: string) {
  const data = await apiFetch<{
    ok: boolean
    manuscript: ApiManuscript
    activity: ApiActivity[]
    invitations?: ApiInvitation[]
    reviews?: ApiReview[]
    editorRecommendations?: ApiEditorRecommendation[]
  }>(`/api/manuscripts/${encodeURIComponent(id)}`)
  return data
}

export async function createManuscript(payload: {
  status: 'draft' | 'submitted'
  title: string
  journalCode: string
  sectionId?: string | null
  articleType: string
  abstract: string
  keywords: string
  specialIssue: string | null
  authors: Array<{
    name: string
    email: string
    affiliation: string
    orcid?: string
    corresponding: boolean
  }>
  manuscriptFile?: File | null
  figureFiles?: File[]
  supplementaryFiles?: File[]
  coverLetter: string
  ethics: Record<string, string>
}) {
  const form = new FormData()
  form.append(
    'data',
    JSON.stringify({
      status: payload.status,
      title: payload.title,
      journalCode: payload.journalCode,
      sectionId: payload.sectionId || null,
      articleType: payload.articleType,
      abstract: payload.abstract,
      keywords: payload.keywords,
      specialIssue: payload.specialIssue,
      authors: payload.authors,
      coverLetter: payload.coverLetter,
      ethics: payload.ethics,
    }),
  )

  if (payload.manuscriptFile) {
    form.append('manuscript', payload.manuscriptFile, payload.manuscriptFile.name)
  }
  for (const file of payload.figureFiles ?? []) {
    form.append('figures', file, file.name)
  }
  for (const file of payload.supplementaryFiles ?? []) {
    form.append('supplementary', file, file.name)
  }

  const token = getToken()
  const headers = new Headers()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${getApiBase()}/api/manuscripts`, {
    method: 'POST',
    headers,
    body: form,
  })

  const data = (await response.json().catch(() => ({}))) as {
    ok?: boolean
    error?: string
    manuscript?: ApiManuscript
  }

  if (!response.ok || !data.manuscript) {
    throw new Error(data.error || `Create failed (${response.status})`)
  }

  return data.manuscript
}

export async function fetchJournals() {
  const data = await apiFetch<{
    ok: boolean
    journals: Array<{
      id: string
      code: string
      name: string
      issn: string | null
      description: string | null
      sections?: Array<{
        id: string
        code: string
        title: string
        description: string | null
      }>
    }>
  }>('/api/journals')
  return data.journals
}

export async function downloadManuscriptFile(
  manuscriptId: string,
  fileId: string,
  preferredName?: string,
) {
  const token = getToken()
  const headers = new Headers()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(
    `${getApiBase()}/api/manuscripts/${encodeURIComponent(manuscriptId)}/files/${encodeURIComponent(fileId)}/download`,
    { headers },
  )

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(data.error || `Download failed (${response.status})`)
  }

  const buffer = await response.arrayBuffer()
  const contentType = response.headers.get('Content-Type') || 'application/octet-stream'
  const disposition = response.headers.get('Content-Disposition') ?? ''
  const utfMatch = /filename\*=UTF-8''([^;]+)/i.exec(disposition)
  const plainMatch = /filename="([^"]+)"/i.exec(disposition)
  const fileName = decodeURIComponent(
    utfMatch?.[1] || plainMatch?.[1] || preferredName || 'file',
  )

  const blob = new Blob([buffer], { type: contentType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export type ApiEditor = {
  id: string
  name: string
  email: string
  affiliation: string | null
}

export async function fetchEditors() {
  const data = await apiFetch<{ ok: boolean; editors: ApiEditor[] }>(
    '/api/editors',
  )
  return data.editors
}

export async function applyScreeningAction(
  manuscriptId: string,
  payload: {
    action: 'pass' | 'formatting' | 'desk_reject'
    editorId?: string
    notes?: string
    rejectReason?: string
  },
) {
  const data = await apiFetch<{ ok: boolean; manuscript: ApiManuscript }>(
    `/api/manuscripts/${encodeURIComponent(manuscriptId)}/screening`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
  return data.manuscript
}

export async function fetchReviewers() {
  const data = await apiFetch<{ ok: boolean; reviewers: ApiReviewer[] }>(
    '/api/reviewers',
  )
  return data.reviewers
}

export async function inviteReviewer(
  manuscriptId: string,
  payload: { reviewerId: string; deadlineDays?: number },
) {
  const data = await apiFetch<{ ok: boolean; invitation: ApiInvitation }>(
    `/api/manuscripts/${encodeURIComponent(manuscriptId)}/invitations`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
  return data.invitation
}

export async function assignEditor(
  manuscriptId: string,
  editorId: string,
) {
  const data = await apiFetch<{ ok: boolean; manuscript: ApiManuscript }>(
    `/api/manuscripts/${encodeURIComponent(manuscriptId)}/assign-editor`,
    {
      method: 'POST',
      body: JSON.stringify({ editorId }),
    },
  )
  return data.manuscript
}

export async function withdrawInvitation(invitationId: string) {
  await apiFetch(`/api/invitations/${encodeURIComponent(invitationId)}/withdraw`, {
    method: 'POST',
    body: '{}',
  })
}

export async function remindInvitation(invitationId: string) {
  await apiFetch(`/api/invitations/${encodeURIComponent(invitationId)}/remind`, {
    method: 'POST',
    body: '{}',
  })
}

export async function addManuscriptFile(
  manuscriptId: string,
  payload: {
    kind: string
    fileName: string
    visibility?: 'author' | 'staff' | 'review'
    reviewRoundId?: string
  },
) {
  const data = await apiFetch<{
    ok: boolean
    file: {
      id: string
      kind: string
      fileName: string
      visibility: string
      sizeBytes?: number | null
    }
  }>(`/api/manuscripts/${encodeURIComponent(manuscriptId)}/files`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data.file
}

export async function updateFileVisibility(
  manuscriptId: string,
  fileId: string,
  visibility: 'author' | 'staff' | 'review',
) {
  const data = await apiFetch<{
    ok: boolean
    file: { id: string; kind: string; fileName: string; visibility: string }
  }>(
    `/api/manuscripts/${encodeURIComponent(manuscriptId)}/files/${encodeURIComponent(fileId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ visibility }),
    },
  )
  return data.file
}

export async function fetchMyInvitations(status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  const data = await apiFetch<{ ok: boolean; invitations: ApiInvitation[] }>(
    `/api/invitations${query}`,
  )
  return data.invitations
}

export async function respondToInvitation(
  invitationId: string,
  payload: { response: 'accepted' | 'declined'; declineReason?: string },
) {
  const data = await apiFetch<{ ok: boolean; invitation: ApiInvitation }>(
    `/api/invitations/${encodeURIComponent(invitationId)}/respond`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
  return data.invitation
}

export async function fetchInvitation(invitationId: string) {
  const data = await apiFetch<{ ok: boolean; invitation: ApiInvitation }>(
    `/api/invitations/${encodeURIComponent(invitationId)}`,
  )
  return data.invitation
}

export async function submitReviewReport(
  invitationId: string,
  payload: {
    summary: string
    strengths: string
    weaknesses: string
    commentsToAuthor: string
    commentsToEditor: string
    recommendation: string
    originality: number
    methodology: number
    clarity: number
  },
) {
  const data = await apiFetch<{ ok: boolean; review: ApiReview }>(
    `/api/invitations/${encodeURIComponent(invitationId)}/review`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
  return data.review
}

export async function fetchMyReviews() {
  const data = await apiFetch<{ ok: boolean; reviews: ApiReview[] }>(
    '/api/invitations/reviews',
  )
  return data.reviews
}

export async function submitEditorRecommendation(
  manuscriptId: string,
  payload: { recommendation: string; note: string },
) {
  const data = await apiFetch<{
    ok: boolean
    recommendation: ApiEditorRecommendation
  }>(
    `/api/manuscripts/${encodeURIComponent(manuscriptId)}/editor-recommendation`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
  return data.recommendation
}

export async function routeRevisionToEditor(
  manuscriptId: string,
  editorId?: string,
) {
  const data = await apiFetch<{ ok: boolean; manuscript: ApiManuscript }>(
    `/api/manuscripts/${encodeURIComponent(manuscriptId)}/route-revision`,
    {
      method: 'POST',
      body: JSON.stringify({ editorId }),
    },
  )
  return data.manuscript
}

export async function recordEditorialDecision(
  manuscriptId: string,
  payload: {
    decision: string
    letter: string
    revisionDays?: number
  },
) {
  const data = await apiFetch<{ ok: boolean; manuscript: ApiManuscript }>(
    `/api/manuscripts/${encodeURIComponent(manuscriptId)}/decision`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
  return data.manuscript
}

export async function startProduction(manuscriptId: string, notes?: string) {
  const data = await apiFetch<{ ok: boolean; manuscript: ApiManuscript }>(
    `/api/manuscripts/${encodeURIComponent(manuscriptId)}/production/start`,
    {
      method: 'POST',
      body: JSON.stringify({ notes }),
    },
  )
  return data.manuscript
}

export async function sendProof(
  manuscriptId: string,
  payload: {
    fileName: string
    notes?: string
    file: File
  },
) {
  const form = new FormData()
  form.append('file', payload.file, payload.fileName)
  if (payload.notes) form.append('notes', payload.notes)
  form.append('fileName', payload.fileName)

  const token = getToken()
  const headers = new Headers()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(
    `${getApiBase()}/api/manuscripts/${encodeURIComponent(manuscriptId)}/production/proof`,
    {
      method: 'POST',
      headers,
      body: form,
    },
  )

  const data = (await response.json().catch(() => ({}))) as {
    ok?: boolean
    error?: string
    manuscript?: ApiManuscript
  }

  if (!response.ok || !data.manuscript) {
    throw new Error(data.error || `Upload failed (${response.status})`)
  }

  return data.manuscript
}

export async function downloadProof(
  manuscriptId: string,
  preferredName?: string,
) {
  const token = getToken()
  const headers = new Headers()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(
    `${getApiBase()}/api/manuscripts/${encodeURIComponent(manuscriptId)}/production/proof/download`,
    { headers },
  )

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(data.error || `Download failed (${response.status})`)
  }

  const buffer = await response.arrayBuffer()
  const contentType = response.headers.get('Content-Type') || 'application/pdf'
  const disposition = response.headers.get('Content-Disposition') ?? ''
  const utfMatch = /filename\*=UTF-8''([^;]+)/i.exec(disposition)
  const plainMatch = /filename="([^"]+)"/i.exec(disposition)
  const fileName = decodeURIComponent(
    utfMatch?.[1] ||
      plainMatch?.[1] ||
      preferredName ||
      'proof.pdf',
  )

  const blob = new Blob([buffer], { type: contentType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName.toLowerCase().endsWith('.pdf')
    ? fileName
    : `${fileName}.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function respondToProof(
  manuscriptId: string,
  payload: { action: 'approve' | 'corrections'; corrections?: string },
) {
  const data = await apiFetch<{ ok: boolean; manuscript: ApiManuscript }>(
    `/api/manuscripts/${encodeURIComponent(manuscriptId)}/production/proof-response`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
  return data.manuscript
}

export async function publishManuscript(
  manuscriptId: string,
  payload: { doi: string; volume?: string; issue?: string },
) {
  const data = await apiFetch<{ ok: boolean; manuscript: ApiManuscript }>(
    `/api/manuscripts/${encodeURIComponent(manuscriptId)}/production/publish`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
  return data.manuscript
}

export async function retryPortalSync(manuscriptId: string) {
  const data = await apiFetch<{ ok: boolean; manuscript: ApiManuscript }>(
    `/api/manuscripts/${encodeURIComponent(manuscriptId)}/production/portal-sync`,
    {
      method: 'POST',
    },
  )
  return data.manuscript
}

export async function submitRevision(
  manuscriptId: string,
  payload: {
    responseLetter: string
    file: File
  },
) {
  const form = new FormData()
  form.append('file', payload.file, payload.file.name)
  form.append('fileName', payload.file.name)
  form.append('responseLetter', payload.responseLetter)

  const token = getToken()
  const headers = new Headers()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(
    `${getApiBase()}/api/manuscripts/${encodeURIComponent(manuscriptId)}/revision`,
    {
      method: 'POST',
      headers,
      body: form,
    },
  )

  const data = (await response.json().catch(() => ({}))) as {
    ok?: boolean
    error?: string
    manuscript?: ApiManuscript
  }

  if (!response.ok || !data.manuscript) {
    throw new Error(data.error || `Revision failed (${response.status})`)
  }

  return data.manuscript
}

export type AdminAnalytics = {
  total: number
  submitted: number
  underReview: number
  accepted: number
  rejected: number
  published: number
  acceptanceRate: number
  pendingInvites: number
  completedReviews: number
  portalSyncs: number
  byJournal: Array<{
    id: string
    code: string
    name: string
    count: number
    published: number
  }>
  recentActivity: ApiActivity[]
}

export type PortalSyncLogItem = {
  id: string
  manuscriptId: string
  title: string
  doi: string
  journal: string
  status: 'synced' | 'pending' | 'failed'
  endpoint: string
  detail: string
  at: string
  payloadPreview: string
}

export async function fetchAdminAnalytics() {
  const data = await apiFetch<{ ok: boolean; analytics: AdminAnalytics }>(
    '/api/admin/analytics',
  )
  return data.analytics
}

export async function fetchPortalSync() {
  const data = await apiFetch<{
    ok: boolean
    endpoint: string
    published: ApiManuscript[]
    syncLog: PortalSyncLogItem[]
  }>('/api/admin/portal-sync')
  return data
}

export async function fetchAdminDirectory() {
  const data = await apiFetch<{
    ok: boolean
    journals: Array<{
      id: string
      code: string
      name: string
      issn: string | null
      description: string | null
    }>
    editors: Array<{
      id: string
      name: string
      email: string
      affiliation: string | null
    }>
    reviewers: Array<{
      id: string
      name: string
      email: string
      affiliation: string | null
      expertise: string | null
    }>
  }>('/api/admin/directory')
  return data
}
