export type AppRole =
  | 'author'
  | 'office'
  | 'editor'
  | 'reviewer'
  | 'production'
  | 'admin'
  | 'journal_manager'
  | 'copyeditor'

export type PortalSyncStatus = 'pending' | 'synced' | 'failed'

export type ManuscriptStatus =
  | 'draft'
  | 'submitted'
  | 'formatting_requested'
  | 'under_review'
  | 'revision_requested'
  | 'revision_submitted'
  | 'accepted'
  | 'copyediting'
  | 'in_production'
  | 'proof_sent'
  | 'ready_for_publication'
  | 'published'
  | 'rejected'

export type InvitationStatus = 'sent' | 'accepted' | 'declined' | 'overdue'
export type ReviewRecommendation =
  | 'accept'
  | 'minor_revision'
  | 'major_revision'
  | 'reject'

export type Manuscript = {
  id: string
  title: string
  journal: string
  articleType: string
  status: ManuscriptStatus
  updatedAt: string
  submittedAt?: string
  version: number
  authors: string
  assignedEditor?: string
  officeNotes?: string
  rejectReason?: string
  decision?: ReviewRecommendation
  decisionLetter?: string
  decisionAt?: string
  revisionDueAt?: string
  lastResponseLetter?: string
  doi?: string
  proofFileName?: string
  proofRound?: number
  proofCorrections?: string
  productionNotes?: string
  portalSyncStatus?: PortalSyncStatus
  portalSyncedAt?: string
  volume?: string
  issue?: string
}

export type PortalSyncEvent = {
  id: string
  manuscriptId: string
  title: string
  doi: string
  journal: string
  status: PortalSyncStatus
  endpoint: string
  detail: string
  at: string
  payloadPreview: string
}

export type EditorialDecision = {
  id: string
  manuscriptId: string
  decision: ReviewRecommendation
  letter: string
  decidedAt: string
  decidedBy: string
  round: number
}

export type ActivityItem = {
  id: string
  manuscriptId: string
  label: string
  detail: string
  at: string
}

export type EditorOption = {
  id: string
  name: string
  role: 'Associate Editor' | 'Editor-in-Chief'
}

export type ReviewerOption = {
  id: string
  name: string
  email: string
  affiliation: string
  expertise: string
}

export type ReviewInvitation = {
  id: string
  manuscriptId: string
  reviewerId: string
  reviewerName: string
  reviewerEmail: string
  status: InvitationStatus
  invitedAt: string
  deadline: string
  declineReason?: string
  round: number
}

export type ReviewReport = {
  id: string
  invitationId: string
  manuscriptId: string
  reviewerName: string
  summary: string
  strengths: string
  weaknesses: string
  commentsToAuthor: string
  commentsToEditor: string
  recommendation: ReviewRecommendation
  originality?: number
  methodology?: number
  clarity?: number
  submittedAt: string
}

export const statusLabels: Record<ManuscriptStatus, string> = {
  draft: 'Draft — not submitted',
  submitted: 'Submitted — awaiting screening',
  formatting_requested: 'Formatting revision requested',
  under_review: 'Under peer review',
  revision_requested: 'Revision required',
  revision_submitted: 'Revision submitted — with Editor in Chief',
  accepted: 'Accepted',
  copyediting: 'Copyediting',
  in_production: 'In production',
  proof_sent: 'Proof ready for your approval',
  ready_for_publication: 'Ready for publication',
  published: 'Published',
  rejected: 'Rejected',
}

export const invitationLabels: Record<InvitationStatus, string> = {
  sent: 'Invitation sent',
  accepted: 'Accepted',
  declined: 'Declined',
  overdue: 'Overdue',
}

export const recommendationLabels: Record<ReviewRecommendation, string> = {
  accept: 'Accept',
  minor_revision: 'Minor revision',
  major_revision: 'Major revision',
  reject: 'Reject',
}

export const roleLabels: Record<AppRole, string> = {
  author: 'Author',
  office: 'Editor',
  editor: 'Editor',
  reviewer: 'Reviewer',
  production: 'Production Editor',
  admin: 'Editor in Chief',
  journal_manager: 'Journal Manager',
  copyeditor: 'Copyeditor',
}

export const editors: EditorOption[] = [
  {
    id: 'ae-vargas',
    name: 'Dr. Elena Vargas',
    role: 'Associate Editor',
  },
  {
    id: 'ae-lin',
    name: 'Dr. Mei Lin',
    role: 'Associate Editor',
  },
  {
    id: 'eic-okoye',
    name: 'Prof. James Okoye',
    role: 'Editor-in-Chief',
  },
]

export const reviewers: ReviewerOption[] = [
  {
    id: 'rev-khan',
    name: 'Dr. Samira Khan',
    email: 'samira.khan@example.edu',
    affiliation: 'University of Leeds',
    expertise: 'Hydrology, numerical methods',
  },
  {
    id: 'rev-berg',
    name: 'Prof. Nils Berg',
    email: 'nils.berg@example.edu',
    affiliation: 'ETH Zurich',
    expertise: 'Mesh generation, CFD',
  },
  {
    id: 'rev-okafor',
    name: 'Dr. Ada Okafor',
    email: 'ada.okafor@example.edu',
    affiliation: 'University of Cape Town',
    expertise: 'Remote sensing, urban systems',
  },
]

export const rolePersonas: Record<
  AppRole,
  { name: string; email: string; affiliation: string; initials: string }
> = {
  author: {
    name: 'Amina Rahman',
    email: 'amina.rahman@example.edu',
    affiliation: 'National University of Singapore',
    initials: 'AR',
  },
  office: {
    name: 'Elena Park',
    email: 'office@publisher.example',
    affiliation: 'Publisher Editorial Office',
    initials: 'EP',
  },
  editor: {
    name: 'Dr. Elena Vargas',
    email: 'e.vargas@publisher.example',
    affiliation: 'Journal of Computational Earth Systems',
    initials: 'EV',
  },
  reviewer: {
    name: 'Dr. Samira Khan',
    email: 'samira.khan@example.edu',
    affiliation: 'University of Leeds',
    initials: 'SK',
  },
  production: {
    name: 'Jordan Blake',
    email: 'production@publisher.example',
    affiliation: 'Publisher Production',
    initials: 'JB',
  },
  admin: {
    name: 'Editor in Chief',
    email: 'admin@publisher.example',
    affiliation: 'IJDH Editorial Office',
    initials: 'EIC',
  },
  journal_manager: {
    name: 'Journal Manager',
    email: 'manager@publisher.example',
    affiliation: 'Journal Operations',
    initials: 'JM',
  },
  copyeditor: {
    name: 'Casey Copeland',
    email: 'copyedit@publisher.example',
    affiliation: 'Publisher Copyediting',
    initials: 'CC',
  },
}

export const manuscripts: Manuscript[] = [
  {
    id: 'MS-2026-0051',
    title: 'Bayesian calibration of urban heat-island models',
    journal: 'Journal of Computational Earth Systems',
    articleType: 'Research',
    status: 'submitted',
    updatedAt: '2026-08-16',
    submittedAt: '2026-08-16',
    version: 1,
    authors: 'A. Rahman, H. Sato',
  },
  {
    id: 'MS-2026-0050',
    title: 'Benchmarking open-source hydrological solvers',
    journal: 'Advances in Intelligent Engineering',
    articleType: 'Review',
    status: 'submitted',
    updatedAt: '2026-08-15',
    submittedAt: '2026-08-15',
    version: 1,
    authors: 'A. Rahman',
  },
  {
    id: 'MS-2026-0042',
    title: 'Adaptive mesh refinement for coastal flood forecasting',
    journal: 'Journal of Computational Earth Systems',
    articleType: 'Research',
    status: 'under_review',
    updatedAt: '2026-08-08',
    submittedAt: '2026-07-21',
    version: 1,
    authors: 'A. Rahman, S. Chen, M. Okonkwo',
    assignedEditor: 'Dr. Elena Vargas',
  },
  {
    id: 'MS-2026-0031',
    title: 'A survey of open review practices in engineering journals',
    journal: 'Journal of Computational Earth Systems',
    articleType: 'Review',
    status: 'revision_requested',
    updatedAt: '2026-08-05',
    submittedAt: '2026-06-12',
    version: 1,
    authors: 'A. Rahman, L. Petrov',
    assignedEditor: 'Dr. Mei Lin',
    decision: 'major_revision',
    decisionLetter:
      'Please address reviewer concerns on methodology transparency and expand the comparison table.',
    decisionAt: '2026-08-05',
    revisionDueAt: '2026-08-26',
  },
  {
    id: 'MS-2026-0018',
    title: 'Low-latency sensor fusion for urban air-quality networks',
    journal: 'Journal of Computational Earth Systems',
    articleType: 'Research',
    status: 'proof_sent',
    updatedAt: '2026-08-09',
    submittedAt: '2026-03-02',
    version: 3,
    authors: 'A. Rahman',
    decision: 'accept',
    decisionAt: '2026-07-01',
    proofFileName: 'MS-2026-0018-proof-r1.pdf',
    proofRound: 1,
  },
  {
    id: 'MS-2026-0024',
    title: 'Ensemble downscaling for regional precipitation extremes',
    journal: 'Journal of Computational Earth Systems',
    articleType: 'Research',
    status: 'accepted',
    updatedAt: '2026-08-12',
    submittedAt: '2026-04-18',
    version: 2,
    authors: 'A. Rahman, Y. Nakamura',
    assignedEditor: 'Dr. Elena Vargas',
    decision: 'accept',
    decisionLetter: 'Accepted after minor revision. Proceed to production.',
    decisionAt: '2026-08-12',
  },
  {
    id: 'MS-2026-0020',
    title: 'Graph neural networks for river network topology inference',
    journal: 'Advances in Intelligent Engineering',
    articleType: 'Research',
    status: 'in_production',
    updatedAt: '2026-08-14',
    submittedAt: '2026-05-02',
    version: 2,
    authors: 'A. Rahman',
    decision: 'accept',
    decisionAt: '2026-08-01',
    productionNotes: 'Copyediting complete. Typesetting in progress.',
  },
  {
    id: 'MS-2025-0114',
    title: 'Editorial: Open data standards for climate model archives',
    journal: 'Journal of Computational Earth Systems',
    articleType: 'Editorial',
    status: 'published',
    updatedAt: '2026-07-15',
    submittedAt: '2025-11-20',
    version: 2,
    authors: 'A. Rahman, Guest Editors',
    doi: '10.54963/jces.2025.0114',
    volume: '3',
    issue: '2',
    portalSyncStatus: 'synced',
    portalSyncedAt: '2026-07-15',
  },
  {
    id: 'MS-2026-0049',
    title: 'Untitled draft — remote sensing pipeline notes',
    journal: 'Journal of Computational Earth Systems',
    articleType: 'Research',
    status: 'draft',
    updatedAt: '2026-08-10',
    version: 1,
    authors: 'A. Rahman',
  },
]

export const activity: ActivityItem[] = [
  {
    id: 'a1',
    manuscriptId: 'MS-2026-0051',
    label: 'Submission received',
    detail: 'New manuscript awaiting technical screening.',
    at: '1 day ago',
  },
  {
    id: 'a0',
    manuscriptId: 'MS-2026-0050',
    label: 'Submission received',
    detail: 'New manuscript awaiting technical screening.',
    at: '2 days ago',
  },
  {
    id: 'a2',
    manuscriptId: 'MS-2026-0018',
    label: 'Proof ready',
    detail: 'Production uploaded proof PDF for your approval.',
    at: '2 hours ago',
  },
  {
    id: 'a3',
    manuscriptId: 'MS-2026-0031',
    label: 'Revision requested',
    detail: 'Editor decision: major revision. Response due in 21 days.',
    at: '5 days ago',
  },
  {
    id: 'a4',
    manuscriptId: 'MS-2026-0042',
    label: 'Under peer review',
    detail: 'Screening passed. Assigned to Dr. Elena Vargas.',
    at: '12 days ago',
  },
  {
    id: 'a5',
    manuscriptId: 'MS-2026-0042',
    label: 'Reviewer invited',
    detail: 'Invitation sent to Dr. Samira Khan (due 2026-08-28).',
    at: '10 days ago',
  },
]

export const reviewInvitations: ReviewInvitation[] = [
  {
    id: 'inv-0042-khan',
    manuscriptId: 'MS-2026-0042',
    reviewerId: 'rev-khan',
    reviewerName: 'Dr. Samira Khan',
    reviewerEmail: 'samira.khan@example.edu',
    status: 'sent',
    invitedAt: '2026-08-07',
    deadline: '2026-08-28',
    round: 1,
  },
  {
    id: 'inv-0042-berg',
    manuscriptId: 'MS-2026-0042',
    reviewerId: 'rev-berg',
    reviewerName: 'Prof. Nils Berg',
    reviewerEmail: 'nils.berg@example.edu',
    status: 'accepted',
    invitedAt: '2026-08-07',
    deadline: '2026-08-28',
    round: 1,
  },
]

export const reviewReports: ReviewReport[] = []

export const portalSyncEvents: PortalSyncEvent[] = [
  {
    id: 'sync-0114',
    manuscriptId: 'MS-2025-0114',
    title: 'Editorial: Open data standards for climate model archives',
    doi: '10.54963/jces.2025.0114',
    journal: 'Journal of Computational Earth Systems',
    status: 'synced',
    endpoint: 'POST /api/portal/articles',
    detail: 'Public metadata pushed to Portal successfully.',
    at: '2026-07-15',
    payloadPreview:
      '{"id":"MS-2025-0114","doi":"10.54963/jces.2025.0114","status":"published"}',
  },
]

export const PORTAL_SYNC_ENDPOINT = 'POST /api/portal/articles'

export const currentUser = {
  ...rolePersonas.author,
  role: 'author' as AppRole,
}

export function todayStamp() {
  return new Date().toISOString().slice(0, 10)
}

export function deadlineInDays(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

export function buildPortalPayload(manuscript: Manuscript, doi: string) {
  return {
    source: 'mms',
    manuscriptId: manuscript.id,
    title: manuscript.title,
    authors: manuscript.authors,
    journal: manuscript.journal,
    articleType: manuscript.articleType,
    doi,
    volume: manuscript.volume ?? null,
    issue: manuscript.issue ?? null,
    status: 'published',
    publishedAt: todayStamp(),
  }
}
