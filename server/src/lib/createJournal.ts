import { prisma } from '../db.js'

export type CreateJournalInput = {
  code: string
  name: string
  issn?: string | null
  description?: string | null
  contactEmail?: string | null
  coverImageUrl?: string | null
  subjectTags?: string | null
  reviewType?: string
  defaultReviewDays?: number
  revisionDays?: number
  policiesMarkdown?: string | null
  /** User who becomes journal_manager (requester or creating admin). */
  managerUserId: string
}

export function normalizeJournalCode(raw: string) {
  return String(raw)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
}

export async function createJournalWithDefaults(input: CreateJournalInput) {
  const code = normalizeJournalCode(input.code)
  const name = String(input.name ?? '').trim()

  if (!code || code.length < 2) {
    throw new Error('Journal code is required (letters/numbers, e.g. ijdh).')
  }
  if (!name || name.length < 3) {
    throw new Error('Journal name is required.')
  }

  const existing = await prisma.journal.findFirst({
    where: { OR: [{ code }, { name }] },
  })
  if (existing) {
    throw new Error('A journal with that code or name already exists.')
  }

  return prisma.journal.create({
    data: {
      code,
      name,
      issn: input.issn?.trim() || null,
      description: input.description?.trim() || null,
      contactEmail: input.contactEmail?.trim() || null,
      coverImageUrl: input.coverImageUrl?.trim() || null,
      subjectTags: input.subjectTags?.trim() || null,
      reviewType: input.reviewType || 'double_blind',
      defaultReviewDays: input.defaultReviewDays ?? 21,
      revisionDays: input.revisionDays ?? 30,
      active: true,
      policiesMarkdown:
        input.policiesMarkdown?.trim() ||
        '## Peer review\nDouble-blind review.\n\n## Ethics\nFollow COPE guidelines.',
      sections: {
        create: [
          {
            code: 'research',
            title: 'Research',
            description: 'Original research articles',
            sortOrder: 1,
          },
          {
            code: 'review',
            title: 'Review',
            description: 'Review and survey articles',
            sortOrder: 2,
          },
        ],
      },
      emailTemplates: {
        create: [
          {
            key: 'submission_received',
            name: 'Submission received',
            subject: 'Submission received: {{number}}',
            bodyHtml:
              '<p>Dear {{authorName}},</p><p>We received your submission <strong>{{title}}</strong> ({{number}}) to {{journalName}}.</p>',
          },
          {
            key: 'reviewer_invitation',
            name: 'Reviewer invitation',
            subject: 'Review invitation: {{number}}',
            bodyHtml:
              '<p>Dear {{reviewerName}},</p><p>You are invited to review <strong>{{title}}</strong> for {{journalName}}. Deadline: {{deadline}}.</p>',
          },
          {
            key: 'editorial_decision',
            name: 'Editorial decision',
            subject: 'Decision on {{number}}',
            bodyHtml:
              '<p>Dear author,</p><p>A decision has been recorded for <strong>{{title}}</strong>: {{decision}}.</p><p>{{letter}}</p>',
          },
        ],
      },
      memberships: {
        create: {
          userId: input.managerUserId,
          role: 'journal_manager',
        },
      },
    },
    include: {
      sections: true,
      _count: { select: { manuscripts: true, memberships: true } },
    },
  })
}
