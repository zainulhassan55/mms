import { apiFetch } from './api'

export type ReviewRound = {
  id: string
  roundNumber: number
  status: 'open' | 'closed'
  openedAt: string
  closedAt?: string | null
  notes?: string | null
  invitations: Array<{
    id: string
    status: string
    deadline: string
    reviewer: { id: string; name: string; email: string }
    review?: { id: string; recommendation: string; submittedAt: string } | null
  }>
  decisions: Array<{ id: string; decision: string; decidedAt: string }>
  files: Array<{ id: string; kind: string; fileName: string }>
}

export type CopyeditAssignment = {
  id: string
  status: 'assigned' | 'in_progress' | 'author_query' | 'approved'
  authorQueries?: string | null
  notes?: string | null
  cleanFileName?: string | null
  assignedAt: string
  completedAt?: string | null
  copyeditor: { id: string; name: string; email: string }
}

export type DiscussionThread = {
  id: string
  subject: string
  audience: string
  createdAt: string
  updatedAt: string
  posts: Array<{
    id: string
    body: string
    createdAt: string
    author: { id: string; name: string; role: string }
  }>
}

export type Galley = {
  id: string
  label: string
  format: string
  fileName: string
  isPrimary: boolean
  uploadedAt: string
}

export type DoiDeposit = {
  id: string
  doi: string
  provider: string
  status: string
  payloadPreview?: string | null
  responseDetail?: string | null
  submittedAt?: string | null
  createdAt: string
}

export type JournalIssue = {
  id: string
  volume: string
  number: string
  year: number
  title: string | null
  status: string
  manuscripts?: Array<{
    id: string
    number: string
    title: string
    status: string
    doi: string | null
  }>
  _count?: { manuscripts: number }
}

export async function fetchReviewRounds(manuscriptId: string) {
  const data = await apiFetch<{ ok: boolean; rounds: ReviewRound[] }>(
    `/api/workflow/${manuscriptId}/rounds`,
  )
  return data.rounds
}

export async function openReviewRound(manuscriptId: string, notes?: string) {
  const data = await apiFetch<{ ok: boolean; round: ReviewRound }>(
    `/api/workflow/${manuscriptId}/rounds`,
    { method: 'POST', body: JSON.stringify({ notes }) },
  )
  return data.round
}

export async function closeReviewRound(manuscriptId: string, roundId: string) {
  const data = await apiFetch<{ ok: boolean; round: ReviewRound }>(
    `/api/workflow/${manuscriptId}/rounds/${roundId}/close`,
    { method: 'POST', body: '{}' },
  )
  return data.round
}

export async function fetchCopyedits(manuscriptId: string) {
  const data = await apiFetch<{ ok: boolean; assignments: CopyeditAssignment[] }>(
    `/api/workflow/${manuscriptId}/copyedit`,
  )
  return data.assignments
}

export async function assignCopyeditor(
  manuscriptId: string,
  copyeditorId: string,
  notes?: string,
) {
  const data = await apiFetch<{
    ok: boolean
    assignment: CopyeditAssignment
  }>(`/api/workflow/${manuscriptId}/copyedit/assign`, {
    method: 'POST',
    body: JSON.stringify({ copyeditorId, notes }),
  })
  return data.assignment
}

export async function updateCopyedit(
  manuscriptId: string,
  assignmentId: string,
  payload: {
    status: string
    authorQueries?: string
    notes?: string
    cleanFileName?: string
  },
) {
  const data = await apiFetch<{ ok: boolean; assignment: CopyeditAssignment }>(
    `/api/workflow/${manuscriptId}/copyedit/${assignmentId}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
  )
  return data.assignment
}

export async function fetchDiscussions(manuscriptId: string) {
  const data = await apiFetch<{ ok: boolean; threads: DiscussionThread[] }>(
    `/api/workflow/${manuscriptId}/discussions`,
  )
  return data.threads
}

export async function createDiscussion(
  manuscriptId: string,
  payload: { subject: string; body: string; audience?: string },
) {
  const data = await apiFetch<{ ok: boolean; thread: DiscussionThread }>(
    `/api/workflow/${manuscriptId}/discussions`,
    { method: 'POST', body: JSON.stringify(payload) },
  )
  return data.thread
}

export async function replyToDiscussion(
  manuscriptId: string,
  threadId: string,
  body: string,
) {
  const data = await apiFetch<{
    ok: boolean
    post: DiscussionThread['posts'][number]
  }>(`/api/workflow/${manuscriptId}/discussions/${threadId}/posts`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  })
  return data.post
}

export async function fetchGalleys(manuscriptId: string) {
  const data = await apiFetch<{ ok: boolean; galleys: Galley[] }>(
    `/api/workflow/${manuscriptId}/galleys`,
  )
  return data.galleys
}

export async function createGalley(
  manuscriptId: string,
  payload: {
    label: string
    format: string
    fileName: string
    isPrimary?: boolean
  },
) {
  const data = await apiFetch<{ ok: boolean; galley: Galley }>(
    `/api/workflow/${manuscriptId}/galleys`,
    { method: 'POST', body: JSON.stringify(payload) },
  )
  return data.galley
}

export async function queueDoiDeposit(manuscriptId: string, doi?: string) {
  const data = await apiFetch<{ ok: boolean; deposit: DoiDeposit }>(
    `/api/workflow/${manuscriptId}/doi-deposit`,
    { method: 'POST', body: JSON.stringify({ doi }) },
  )
  return data.deposit
}

export async function fetchDoiDeposits(manuscriptId: string) {
  const data = await apiFetch<{ ok: boolean; deposits: DoiDeposit[] }>(
    `/api/workflow/${manuscriptId}/doi-deposits`,
  )
  return data.deposits
}

export async function fetchJournalIssues(journalId: string) {
  const data = await apiFetch<{ ok: boolean; issues: JournalIssue[] }>(
    `/api/journals/${journalId}/issues`,
  )
  return data.issues
}

export async function scheduleIntoIssue(
  issueId: string,
  manuscriptId: string,
  sortOrder = 0,
) {
  return apiFetch<{ ok: boolean }>(`/api/issues/${issueId}/schedule`, {
    method: 'POST',
    body: JSON.stringify({ manuscriptId, sortOrder }),
  })
}

export async function fetchDirectoryUsers() {
  const data = await apiFetch<{
    ok: boolean
    users: Array<{
      id: string
      email: string
      name: string
      role: string
      affiliation: string | null
    }>
  }>('/api/users')
  return data.users
}

/** OJS-style stage order for UI rails. */
export const workflowStages = [
  { id: 'submission', label: 'Submission', statuses: ['draft', 'submitted', 'formatting_requested'] },
  { id: 'review', label: 'Review', statuses: ['under_review', 'revision_requested', 'revision_submitted'] },
  { id: 'copyediting', label: 'Copyediting', statuses: ['accepted', 'copyediting'] },
  { id: 'production', label: 'Production', statuses: ['in_production', 'proof_sent', 'ready_for_publication'] },
  { id: 'published', label: 'Published', statuses: ['published'] },
] as const

export function activeWorkflowStageIndex(status: string): number {
  if (status === 'rejected') return -1
  const idx = workflowStages.findIndex((stage) =>
    (stage.statuses as readonly string[]).includes(status),
  )
  return idx >= 0 ? idx : 0
}
