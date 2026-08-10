export type ManuscriptStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'revision_requested'
  | 'accepted'
  | 'in_production'
  | 'proof_sent'
  | 'published'
  | 'rejected'

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
}

export type ActivityItem = {
  id: string
  manuscriptId: string
  label: string
  detail: string
  at: string
}

export const statusLabels: Record<ManuscriptStatus, string> = {
  draft: 'Draft — not submitted',
  submitted: 'Submitted — awaiting screening',
  under_review: 'Under peer review',
  revision_requested: 'Revision required',
  accepted: 'Accepted',
  in_production: 'In production',
  proof_sent: 'Proof ready for your approval',
  published: 'Published',
  rejected: 'Rejected',
}

export const manuscripts: Manuscript[] = [
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
    manuscriptId: 'MS-2026-0018',
    label: 'Proof ready',
    detail: 'Production uploaded proof PDF for your approval.',
    at: '2 hours ago',
  },
  {
    id: 'a2',
    manuscriptId: 'MS-2026-0031',
    label: 'Revision requested',
    detail: 'Editor decision: major revision. Response due in 21 days.',
    at: '5 days ago',
  },
  {
    id: 'a3',
    manuscriptId: 'MS-2026-0042',
    label: 'Under peer review',
    detail: 'Screening passed. Reviewers invited.',
    at: '12 days ago',
  },
]

export const currentUser = {
  name: 'Amina Rahman',
  email: 'amina.rahman@example.edu',
  affiliation: 'National University of Singapore',
  role: 'Author' as const,
  initials: 'AR',
}
