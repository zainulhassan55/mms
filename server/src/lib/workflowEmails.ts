import { prisma } from '../db.js'
import {
  appLink,
  emailLayout,
  escapeHtml,
  journalFromName,
  sendMail,
  type MailCategory,
} from './mail.js'
import { roleLabels } from './labels.js'

type Person = { name: string; email: string }

async function loadAuthor(manuscriptId: string): Promise<Person | null> {
  const manuscript = await prisma.manuscript.findUnique({
    where: { id: manuscriptId },
    select: {
      submittingAuthor: { select: { name: true, email: true } },
      authors: {
        where: { isCorresponding: true },
        take: 1,
        select: { name: true, email: true },
      },
    },
  })
  if (!manuscript) return null

  const corresponding = manuscript.authors[0]
  if (corresponding?.email) {
    return {
      name: corresponding.name || manuscript.submittingAuthor.name,
      email: corresponding.email,
    }
  }

  return {
    name: manuscript.submittingAuthor.name,
    email: manuscript.submittingAuthor.email,
  }
}

async function loadEditor(manuscriptId: string): Promise<Person | null> {
  const manuscript = await prisma.manuscript.findUnique({
    where: { id: manuscriptId },
    select: {
      assignedEditor: { select: { name: true, email: true } },
    },
  })
  if (!manuscript?.assignedEditor?.email) return null
  return manuscript.assignedEditor
}

async function loadEicRecipients(journalId?: string | null): Promise<Person[]> {
  const byEmail = new Map<string, Person>()

  const platform = await prisma.user.findMany({
    where: { role: { in: ['admin', 'journal_manager'] } },
    select: { name: true, email: true },
  })
  for (const user of platform) {
    byEmail.set(user.email.toLowerCase(), user)
  }

  if (journalId) {
    const members = await prisma.journalMembership.findMany({
      where: {
        journalId,
        role: 'journal_manager',
      },
      select: { user: { select: { name: true, email: true } } },
    })
    for (const row of members) {
      byEmail.set(row.user.email.toLowerCase(), {
        name: row.user.name,
        email: row.user.email,
      })
    }
  }

  return [...byEmail.values()]
}

async function loadJournalEditorialStaff(
  journalId: string,
): Promise<Person[]> {
  const byEmail = new Map<string, Person>()

  const members = await prisma.journalMembership.findMany({
    where: {
      journalId,
      role: { in: ['journal_manager', 'editor', 'section_editor'] },
    },
    select: { user: { select: { name: true, email: true } } },
  })
  for (const row of members) {
    byEmail.set(row.user.email.toLowerCase(), {
      name: row.user.name,
      email: row.user.email,
    })
  }

  for (const eic of await loadEicRecipients(journalId)) {
    byEmail.set(eic.email.toLowerCase(), eic)
  }

  return [...byEmail.values()]
}

async function mailTo(
  person: Person,
  input: {
    subject: string
    text: string
    html: string
    category?: MailCategory
  },
) {
  await sendMail({
    to: person.email,
    subject: input.subject,
    text: input.text,
    html: input.html,
    category: input.category,
  })
}

function manuscriptBlock(input: {
  number: string
  title: string
  journalName?: string | null
}) {
  return `<p><strong>Manuscript ID:</strong> ${escapeHtml(input.number)}<br/>
<strong>Title:</strong> ${escapeHtml(input.title)}<br/>
<strong>Journal:</strong> ${escapeHtml(input.journalName || journalFromName())}</p>`
}

function cta(label: string, href: string) {
  return `<p style="margin:18px 0;"><a href="${escapeHtml(href)}" style="display:inline-block;background:#0b5f56;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;">${escapeHtml(label)}</a></p>
<p style="font-size:12px;color:#3d6673;">Or open: ${escapeHtml(href)}</p>`
}

function queue(task: Promise<unknown>) {
  void task.catch((error) => console.error('[workflow-email]', error))
}

export function notifyAccountWelcome(input: {
  email: string
  name: string
  role: string
  createdByAdmin?: boolean
}) {
  queue(
    (async () => {
      const href = appLink('/login')
      const roleLabel =
        roleLabels[input.role as keyof typeof roleLabels] || input.role
      const intro = input.createdByAdmin
        ? `An account has been created for you on ${journalFromName()} as ${roleLabel}. Use the password provided by your administrator to sign in.`
        : `Welcome to ${journalFromName()}. Your ${roleLabel} account is ready.`
      await sendMail({
        to: input.email,
        subject: `Welcome to ${journalFromName()}`,
        category: 'transactional',
        respectPrefs: false,
        text: `Dear ${input.name},

${intro}

Sign in: ${href}`,
        html: emailLayout(
          'Welcome',
          `<p>Dear ${escapeHtml(input.name)},</p>
<p>${escapeHtml(intro)}</p>
${cta('Sign in', href)}`,
        ),
      })
    })(),
  )
}

export function notifyJournalRequestSubmitted(input: {
  requestId: string
  proposedName: string
  proposedCode: string
  requesterName: string
  requesterEmail: string
}) {
  queue(
    (async () => {
      const href = appLink('/admin/journal-requests')
      const admins = await prisma.user.findMany({
        where: { role: 'admin' },
        select: { name: true, email: true },
      })
      await Promise.all(
        admins.map((admin) =>
          sendMail({
            to: admin.email,
            category: 'workflow',
            subject: `Journal request: ${input.proposedName}`,
            text: `Dear ${admin.name},

${input.requesterName} (${input.requesterEmail}) requested a journal workspace:

Name: ${input.proposedName}
Code: ${input.proposedCode}

Review: ${href}`,
            html: emailLayout(
              'New journal request',
              `<p>Dear ${escapeHtml(admin.name)},</p>
<p><strong>${escapeHtml(input.requesterName)}</strong> (${escapeHtml(input.requesterEmail)}) requested a journal workspace.</p>
<p><strong>Name:</strong> ${escapeHtml(input.proposedName)}<br/>
<strong>Code:</strong> ${escapeHtml(input.proposedCode)}</p>
${cta('Review requests', href)}`,
            ),
          }),
        ),
      )
    })(),
  )
}

export function notifyJournalRequestDecision(input: {
  email: string
  name: string
  approved: boolean
  journalName: string
  journalCode: string
  adminNote?: string | null
}) {
  queue(
    (async () => {
      const href = input.approved
        ? appLink('/manager/journals')
        : appLink('/request-journal')
      const title = input.approved
        ? 'Journal request approved'
        : 'Journal request not approved'
      const body = input.approved
        ? `Your request for “${input.journalName}” (${input.journalCode}) was approved. You are now the journal manager.`
        : `Your request for “${input.journalName}” (${input.journalCode}) was not approved.`
      await sendMail({
        to: input.email,
        category: 'decision',
        subject: title,
        text: `Dear ${input.name},

${body}
${input.adminNote ? `\nNote: ${input.adminNote}\n` : ''}
${href}`,
        html: emailLayout(
          title,
          `<p>Dear ${escapeHtml(input.name)},</p>
<p>${escapeHtml(body)}</p>
${
  input.adminNote
    ? `<p><strong>Note:</strong> ${escapeHtml(input.adminNote)}</p>`
    : ''
}
${cta(input.approved ? 'Open journal settings' : 'Submit another request', href)}`,
        ),
      })
    })(),
  )
}

export function notifySubmissionReceived(input: {
  manuscriptId: string
  number: string
  title: string
  journalName?: string | null
  journalId?: string | null
}) {
  queue(
    (async () => {
      const author = await loadAuthor(input.manuscriptId)
      if (author) {
        const href = appLink(`/author/submissions/${input.number}`)
        await mailTo(author, {
          category: 'workflow',
          subject: `[${input.number}] Submission received`,
          text: `Dear ${author.name},

Thank you for submitting your manuscript to ${input.journalName || journalFromName()}.

Manuscript ID: ${input.number}
Title: ${input.title}

Your submission has been received and will enter editorial screening.

${href}`,
          html: emailLayout(
            'Submission received',
            `<p>Dear ${escapeHtml(author.name)},</p>
<p>Thank you for submitting your manuscript. It has been received and will enter editorial screening.</p>
${manuscriptBlock(input)}
${cta('View submission', href)}`,
          ),
        })
      }

      if (input.journalId) {
        const staff = await loadJournalEditorialStaff(input.journalId)
        const editorHref = appLink(`/editor/manuscript/${input.number}`)
        await Promise.all(
          staff.map((person) =>
            mailTo(person, {
              category: 'workflow',
              subject: `[${input.number}] New submission awaiting screening`,
              text: `Dear ${person.name},

A new manuscript was submitted and is awaiting editorial screening.

Manuscript ID: ${input.number}
Title: ${input.title}

${editorHref}`,
              html: emailLayout(
                'New submission',
                `<p>Dear ${escapeHtml(person.name)},</p>
<p>A new manuscript was submitted and is awaiting editorial screening.</p>
${manuscriptBlock(input)}
${cta('Open in editor queue', editorHref)}`,
              ),
            }),
          ),
        )
      }
    })(),
  )
}

export function notifyUnderReview(input: {
  manuscriptId: string
  number: string
  title: string
  journalName?: string | null
}) {
  queue(
    (async () => {
      const author = await loadAuthor(input.manuscriptId)
      if (!author) return
      const href = appLink(`/author/submissions/${input.number}`)
      await sendMail({
        to: author.email,
        category: 'workflow',
        subject: `[${input.number}] Now under peer review`,
        text: `Dear ${author.name},

Your manuscript has passed screening and is now under peer review.

Manuscript ID: ${input.number}
Title: ${input.title}

${href}`,
        html: emailLayout(
          'Manuscript under peer review',
          `<p>Dear ${escapeHtml(author.name)},</p>
<p>Your manuscript has passed screening and is now under peer review.</p>
${manuscriptBlock(input)}
${cta('Track status', href)}`,
        ),
      })
    })(),
  )
}

export function notifyFormattingRequested(input: {
  manuscriptId: string
  number: string
  title: string
  journalName?: string | null
  notes: string
}) {
  queue(
    (async () => {
      const author = await loadAuthor(input.manuscriptId)
      if (!author) return
      const href = appLink(`/author/submissions/${input.number}`)
      await sendMail({
        to: author.email,
        category: 'decision',
        subject: `[${input.number}] Formatting revision requested`,
        text: `Dear ${author.name},

Your manuscript requires formatting revisions before peer review can continue.

Manuscript ID: ${input.number}
Title: ${input.title}

Editorial notes:
${input.notes}

${href}`,
        html: emailLayout(
          'Formatting revision requested',
          `<p>Dear ${escapeHtml(author.name)},</p>
<p>Your manuscript requires formatting revisions before peer review can continue.</p>
${manuscriptBlock(input)}
<p><strong>Editorial notes</strong></p>
<p style="white-space:pre-wrap;background:#f8fafb;border:1px solid #d4dde3;border-radius:8px;padding:12px;">${escapeHtml(input.notes)}</p>
${cta('Upload corrected files', href)}`,
        ),
      })
    })(),
  )
}

export function notifyDeskRejected(input: {
  manuscriptId: string
  number: string
  title: string
  journalName?: string | null
  reason: string
}) {
  queue(
    (async () => {
      const author = await loadAuthor(input.manuscriptId)
      if (!author) return
      const href = appLink(`/author/submissions/${input.number}`)
      await sendMail({
        to: author.email,
        category: 'decision',
        subject: `[${input.number}] Decision: desk rejection`,
        text: `Dear ${author.name},

We regret to inform you that your manuscript has been desk rejected after editorial screening.

Manuscript ID: ${input.number}
Title: ${input.title}

Reason:
${input.reason}

${href}`,
        html: emailLayout(
          'Desk rejection',
          `<p>Dear ${escapeHtml(author.name)},</p>
<p>We regret to inform you that your manuscript has been desk rejected after editorial screening.</p>
${manuscriptBlock(input)}
<p><strong>Reason</strong></p>
<p style="white-space:pre-wrap;background:#fff1f2;border:1px solid #fecdd3;border-radius:8px;padding:12px;">${escapeHtml(input.reason)}</p>
${cta('Open manuscript', href)}`,
        ),
      })
    })(),
  )
}

export function notifyEditorialDecision(input: {
  manuscriptId: string
  number: string
  title: string
  journalName?: string | null
  decision: 'accept' | 'reject' | 'minor_revision' | 'major_revision'
  letter: string
  revisionDueAt?: string | null
}) {
  queue(
    (async () => {
      const author = await loadAuthor(input.manuscriptId)
      if (!author) return
      const href = appLink(`/author/submissions/${input.number}`)
      const labels = {
        accept: 'Acceptance',
        reject: 'Rejection',
        minor_revision: 'Minor revision requested',
        major_revision: 'Major revision requested',
      } as const
      const subjectLabel = labels[input.decision]
      await sendMail({
        to: author.email,
        category: 'decision',
        subject: `[${input.number}] Editorial decision: ${subjectLabel}`,
        text: `Dear ${author.name},

An editorial decision has been recorded for your manuscript.

Manuscript ID: ${input.number}
Title: ${input.title}
Decision: ${subjectLabel}${input.revisionDueAt ? `\nRevision due: ${input.revisionDueAt}` : ''}

Decision letter:
${input.letter}

${href}`,
        html: emailLayout(
          `Editorial decision: ${subjectLabel}`,
          `<p>Dear ${escapeHtml(author.name)},</p>
<p>An editorial decision has been recorded for your manuscript.</p>
${manuscriptBlock(input)}
<p><strong>Decision:</strong> ${escapeHtml(subjectLabel)}${
            input.revisionDueAt
              ? `<br/><strong>Revision due:</strong> ${escapeHtml(input.revisionDueAt)}`
              : ''
          }</p>
<p><strong>Decision letter</strong></p>
<p style="white-space:pre-wrap;background:#f8fafb;border:1px solid #d4dde3;border-radius:8px;padding:12px;">${escapeHtml(input.letter)}</p>
${cta('Open manuscript', href)}`,
        ),
      })
    })(),
  )
}

export function notifyReviewerInvitation(input: {
  reviewerEmail: string
  reviewerName: string
  number: string
  title: string
  journalName?: string | null
  deadline: string
  round?: number
}) {
  queue(
    (async () => {
      const href = appLink('/reviewer/invitations')
      const roundLabel =
        input.round && input.round > 1 ? ` (round ${input.round})` : ''
      await sendMail({
        to: input.reviewerEmail,
        category: 'workflow',
        subject: `[${input.number}] Invitation to review${roundLabel}`,
        text: `Dear ${input.reviewerName},

You are invited to review a manuscript for ${input.journalName || journalFromName()}.

Manuscript ID: ${input.number}
Title: ${input.title}
Review deadline: ${input.deadline}

Please sign in to accept or decline this invitation.

${href}`,
        html: emailLayout(
          `Invitation to review${roundLabel}`,
          `<p>Dear ${escapeHtml(input.reviewerName)},</p>
<p>You are invited to review a manuscript for ${escapeHtml(input.journalName || journalFromName())}.</p>
${manuscriptBlock(input)}
<p><strong>Review deadline:</strong> ${escapeHtml(input.deadline)}</p>
${cta('Respond to invitation', href)}`,
        ),
      })
    })(),
  )
}

export function notifyEditorInvitationResponse(input: {
  manuscriptId: string
  number: string
  title: string
  reviewerName: string
  response: 'accepted' | 'declined'
  declineReason?: string
}) {
  queue(
    (async () => {
      const editor = await loadEditor(input.manuscriptId)
      if (!editor) return
      const href = appLink(`/editor/manuscript/${input.number}`)
      const verb = input.response
      await sendMail({
        to: editor.email,
        category: 'workflow',
        subject: `[${input.number}] Reviewer ${verb} invitation`,
        text: `Dear ${editor.name},

${input.reviewerName} has ${verb} the review invitation for ${input.number}.

Title: ${input.title}
${input.declineReason ? `Reason: ${input.declineReason}\n` : ''}
${href}`,
        html: emailLayout(
          `Reviewer ${verb} invitation`,
          `<p>Dear ${escapeHtml(editor.name)},</p>
<p><strong>${escapeHtml(input.reviewerName)}</strong> has ${verb} the review invitation.</p>
${manuscriptBlock(input)}
${
  input.declineReason
    ? `<p><strong>Reason:</strong> ${escapeHtml(input.declineReason)}</p>`
    : ''
}
${cta('Open manuscript', href)}`,
        ),
      })
    })(),
  )
}

export function notifyEditorReviewSubmitted(input: {
  manuscriptId: string
  number: string
  title: string
  reviewerName: string
  recommendation: string
}) {
  queue(
    (async () => {
      const editor = await loadEditor(input.manuscriptId)
      if (!editor) return
      const href = appLink(`/editor/manuscript/${input.number}`)
      await sendMail({
        to: editor.email,
        category: 'workflow',
        subject: `[${input.number}] Review submitted`,
        text: `Dear ${editor.name},

${input.reviewerName} submitted a review for ${input.number}.
Recommendation: ${input.recommendation.replaceAll('_', ' ')}

${href}`,
        html: emailLayout(
          'Review submitted',
          `<p>Dear ${escapeHtml(editor.name)},</p>
<p><strong>${escapeHtml(input.reviewerName)}</strong> submitted a review.</p>
${manuscriptBlock(input)}
<p><strong>Recommendation:</strong> ${escapeHtml(input.recommendation.replaceAll('_', ' '))}</p>
${cta('Open manuscript', href)}`,
        ),
      })
    })(),
  )
}

export function notifyEditorRevisionSubmitted(input: {
  manuscriptId: string
  number: string
  title: string
  journalName?: string | null
  journalId?: string | null
  kind: 'formatting' | 'content'
}) {
  queue(
    (async () => {
      const href = appLink(`/editor/manuscript/${input.number}`)
      const author = await loadAuthor(input.manuscriptId)
      if (author) {
        await mailTo(author, {
          category: 'workflow',
          subject: `[${input.number}] Revision received`,
          text: `Dear ${author.name},

We received your revised manuscript (${input.number}).

${
  input.kind === 'formatting'
    ? 'It will return to editorial screening.'
    : 'The Editor in Chief will route it to an editor for the next review round.'
}

${appLink(`/author/submissions/${input.number}`)}`,
          html: emailLayout(
            'Revision received',
            `<p>Dear ${escapeHtml(author.name)},</p>
<p>We received your revised manuscript.</p>
${manuscriptBlock(input)}
<p>${
              input.kind === 'formatting'
                ? 'It will return to editorial screening.'
                : 'The Editor in Chief will route it to an editor for the next review round.'
            }</p>
${cta('Track status', appLink(`/author/submissions/${input.number}`))}`,
          ),
        })
      }

      if (input.kind === 'formatting') {
        const editor = await loadEditor(input.manuscriptId)
        if (!editor) return
        await mailTo(editor, {
          category: 'workflow',
          subject: `[${input.number}] Formatting revision submitted`,
          text: `Dear ${editor.name},

Formatting revision submitted for ${input.number}: ${input.title}

${href}`,
          html: emailLayout(
            'Formatting revision submitted',
            `<p>Dear ${escapeHtml(editor.name)},</p>
<p>The author has uploaded a formatting revision.</p>
${manuscriptBlock(input)}
${cta('Open manuscript', href)}`,
          ),
        })
        return
      }

      const eics = await loadEicRecipients(input.journalId)
      await Promise.all(
        eics.map((person) =>
          mailTo(person, {
            category: 'workflow',
            subject: `[${input.number}] Author revision awaiting EIC routing`,
            text: `Dear ${person.name},

An author revision was submitted and is awaiting Editor in Chief routing.

Manuscript ID: ${input.number}
Title: ${input.title}

${href}`,
            html: emailLayout(
              'Author revision awaiting routing',
              `<p>Dear ${escapeHtml(person.name)},</p>
<p>An author revision was submitted and needs to be routed to a handling editor.</p>
${manuscriptBlock(input)}
${cta('Route revision', href)}`,
            ),
          }),
        ),
      )
    })(),
  )
}

export function notifyEicEditorRecommendation(input: {
  manuscriptId: string
  number: string
  title: string
  journalName?: string | null
  journalId?: string | null
  editorName: string
  recommendation: string
  note: string
}) {
  queue(
    (async () => {
      const href = appLink(`/editor/manuscript/${input.number}`)
      const recipients = await loadEicRecipients(input.journalId)
      const label = input.recommendation.replaceAll('_', ' ')
      await Promise.all(
        recipients.map((person) =>
          mailTo(person, {
            category: 'decision',
            subject: `[${input.number}] Editor recommendation: ${label}`,
            text: `Dear ${person.name},

${input.editorName} recommends ${label} for ${input.number}.

Note:
${input.note}

${href}`,
            html: emailLayout(
              'Editor recommendation for EIC',
              `<p>Dear ${escapeHtml(person.name)},</p>
<p><strong>${escapeHtml(input.editorName)}</strong> recommends <strong>${escapeHtml(label)}</strong>.</p>
${manuscriptBlock(input)}
<p><strong>Editor note</strong></p>
<p style="white-space:pre-wrap;background:#f8fafb;border:1px solid #d4dde3;border-radius:8px;padding:12px;">${escapeHtml(input.note)}</p>
${cta('Open manuscript', href)}`,
            ),
          }),
        ),
      )
    })(),
  )
}

export function notifyEditorRevisionRouted(input: {
  manuscriptId: string
  number: string
  title: string
  journalName?: string | null
  editorEmail: string
  editorName: string
  roundNumber: number
}) {
  queue(
    (async () => {
      const href = appLink(`/editor/manuscript/${input.number}`)
      await sendMail({
        to: input.editorEmail,
        category: 'workflow',
        subject: `[${input.number}] Revision routed — invite reviewers (round ${input.roundNumber})`,
        text: `Dear ${input.editorName},

The Editor in Chief routed a revised manuscript to you for review round ${input.roundNumber}.

Manuscript ID: ${input.number}
Title: ${input.title}

Please invite previous or new reviewers.

${href}`,
        html: emailLayout(
          'Revision routed to you',
          `<p>Dear ${escapeHtml(input.editorName)},</p>
<p>The Editor in Chief routed a revised manuscript to you for review round ${input.roundNumber}. Please invite previous or new reviewers.</p>
${manuscriptBlock(input)}
${cta('Invite reviewers', href)}`,
        ),
      })

      const author = await loadAuthor(input.manuscriptId)
      if (author) {
        await mailTo(author, {
          category: 'workflow',
          subject: `[${input.number}] Revision entered peer review`,
          text: `Dear ${author.name},

Your revised manuscript is now under peer review again (round ${input.roundNumber}).

${appLink(`/author/submissions/${input.number}`)}`,
          html: emailLayout(
            'Revision under peer review',
            `<p>Dear ${escapeHtml(author.name)},</p>
<p>Your revised manuscript is now under peer review again (round ${input.roundNumber}).</p>
${manuscriptBlock(input)}
${cta('Track status', appLink(`/author/submissions/${input.number}`))}`,
          ),
        })
      }
    })(),
  )
}

export function notifyCopyeditorAssigned(input: {
  copyeditorEmail: string
  copyeditorName: string
  number: string
  title: string
  journalName?: string | null
}) {
  queue(
    (async () => {
      const href = appLink('/copyedit/queue')
      await sendMail({
        to: input.copyeditorEmail,
        category: 'workflow',
        subject: `[${input.number}] Copyediting assignment`,
        text: `Dear ${input.copyeditorName},

You have been assigned to copyedit a manuscript.

Manuscript ID: ${input.number}
Title: ${input.title}

${href}`,
        html: emailLayout(
          'Copyediting assignment',
          `<p>Dear ${escapeHtml(input.copyeditorName)},</p>
<p>You have been assigned to copyedit a manuscript.</p>
${manuscriptBlock(input)}
${cta('Open copyedit queue', href)}`,
        ),
      })
    })(),
  )
}

export function notifyProductionHandoff(input: {
  manuscriptId: string
  number: string
  title: string
  journalName?: string | null
  journalId?: string | null
}) {
  queue(
    (async () => {
      const href = appLink(`/production/manuscript/${input.number}`)
      const byEmail = new Map<string, Person>()

      const productionUsers = await prisma.user.findMany({
        where: { role: 'production' },
        select: { name: true, email: true },
      })
      for (const user of productionUsers) {
        byEmail.set(user.email.toLowerCase(), user)
      }

      if (input.journalId) {
        const members = await prisma.journalMembership.findMany({
          where: { journalId: input.journalId, role: 'production' },
          select: { user: { select: { name: true, email: true } } },
        })
        for (const row of members) {
          byEmail.set(row.user.email.toLowerCase(), {
            name: row.user.name,
            email: row.user.email,
          })
        }
      }

      await Promise.all(
        [...byEmail.values()].map((person) =>
          mailTo(person, {
            category: 'workflow',
            subject: `[${input.number}] Ready for production`,
            text: `Dear ${person.name},

A manuscript is ready for production.

Manuscript ID: ${input.number}
Title: ${input.title}

${href}`,
            html: emailLayout(
              'Production handoff',
              `<p>Dear ${escapeHtml(person.name)},</p>
<p>A manuscript is ready for production.</p>
${manuscriptBlock(input)}
${cta('Open production file', href)}`,
            ),
          }),
        ),
      )
    })(),
  )
}

export function notifyAuthorProofSent(input: {
  manuscriptId: string
  number: string
  title: string
  journalName?: string | null
}) {
  queue(
    (async () => {
      const author = await loadAuthor(input.manuscriptId)
      if (!author) return
      const href = appLink(`/author/submissions/${input.number}/proof`)
      await sendMail({
        to: author.email,
        category: 'workflow',
        subject: `[${input.number}] Proof ready for review`,
        text: `Dear ${author.name},

Page proofs for your accepted manuscript are ready for review.

Manuscript ID: ${input.number}
Title: ${input.title}

${href}`,
        html: emailLayout(
          'Proof ready for review',
          `<p>Dear ${escapeHtml(author.name)},</p>
<p>Page proofs for your accepted manuscript are ready for review.</p>
${manuscriptBlock(input)}
${cta('Review proof', href)}`,
        ),
      })
    })(),
  )
}

export function notifyAuthorPublished(input: {
  manuscriptId: string
  number: string
  title: string
  journalName?: string | null
  doi?: string | null
}) {
  queue(
    (async () => {
      const author = await loadAuthor(input.manuscriptId)
      if (!author) return
      const href = appLink(`/author/submissions/${input.number}`)
      await sendMail({
        to: author.email,
        category: 'decision',
        subject: `[${input.number}] Manuscript published`,
        text: `Dear ${author.name},

Your manuscript has been published.

Manuscript ID: ${input.number}
Title: ${input.title}
${input.doi ? `DOI: ${input.doi}\n` : ''}
${href}`,
        html: emailLayout(
          'Manuscript published',
          `<p>Dear ${escapeHtml(author.name)},</p>
<p>Congratulations — your manuscript has been published.</p>
${manuscriptBlock(input)}
${input.doi ? `<p><strong>DOI:</strong> ${escapeHtml(input.doi)}</p>` : ''}
${cta('Open manuscript', href)}`,
        ),
      })
    })(),
  )
}

export function notifyPasswordReset(input: {
  email: string
  name: string
  resetToken: string
}) {
  queue(
    (async () => {
      const href = appLink('/forgot-password')
      await sendMail({
        to: input.email,
        category: 'transactional',
        respectPrefs: false,
        subject: 'Password reset code',
        text: `Dear ${input.name},

Use this reset code to choose a new password (valid for 1 hour):

${input.resetToken}

Open: ${href}`,
        html: emailLayout(
          'Password reset',
          `<p>Dear ${escapeHtml(input.name)},</p>
<p>Use this reset code to choose a new password (valid for 1 hour):</p>
<p style="font-size:18px;font-weight:700;letter-spacing:0.04em;">${escapeHtml(input.resetToken)}</p>
${cta('Reset password', href)}`,
        ),
      })
    })(),
  )
}

export function notifyReviewerDeadlineReminder(input: {
  reviewerEmail: string
  reviewerName: string
  number: string
  title: string
  journalName?: string | null
  deadline: string
  kind: 'upcoming' | 'overdue'
  status: 'sent' | 'accepted' | 'overdue'
}) {
  queue(
    (async () => {
      const href =
        input.status === 'accepted' || input.status === 'overdue'
          ? appLink('/reviewer/active')
          : appLink('/reviewer/invitations')
      const isOverdue = input.kind === 'overdue'
      const subject = isOverdue
        ? `[${input.number}] Reminder: review overdue`
        : `[${input.number}] Reminder: review deadline approaching`
      const heading = isOverdue
        ? 'Review deadline overdue'
        : 'Review deadline approaching'
      const intro = isOverdue
        ? `This is a reminder that your review deadline for the manuscript below has passed (${input.deadline}). Please complete your review or decline the invitation as soon as possible.`
        : `This is a courtesy reminder that your review deadline for the manuscript below is approaching (${input.deadline}).`

      await sendMail({
        to: input.reviewerEmail,
        category: 'deadline',
        subject,
        text: `Dear ${input.reviewerName},

${intro}

Manuscript ID: ${input.number}
Title: ${input.title}
Deadline: ${input.deadline}

${href}`,
        html: emailLayout(
          heading,
          `<p>Dear ${escapeHtml(input.reviewerName)},</p>
<p>${escapeHtml(intro)}</p>
${manuscriptBlock(input)}
<p><strong>Deadline:</strong> ${escapeHtml(input.deadline)}</p>
${cta(isOverdue ? 'Open review tasks' : 'Open invitation', href)}`,
        ),
      })
    })(),
  )
}

export function notifyEditorReviewOverdue(input: {
  manuscriptId: string
  number: string
  title: string
  journalName?: string | null
  reviewerName: string
  deadline: string
}) {
  queue(
    (async () => {
      const editor = await loadEditor(input.manuscriptId)
      if (!editor) return
      const href = appLink(`/editor/manuscript/${input.number}`)
      await sendMail({
        to: editor.email,
        category: 'deadline',
        subject: `[${input.number}] Reviewer overdue`,
        text: `Dear ${editor.name},

A review assignment is overdue.

Manuscript ID: ${input.number}
Title: ${input.title}
Reviewer: ${input.reviewerName}
Deadline: ${input.deadline}

${href}`,
        html: emailLayout(
          'Reviewer overdue',
          `<p>Dear ${escapeHtml(editor.name)},</p>
<p>A review assignment is overdue.</p>
${manuscriptBlock(input)}
<p><strong>Reviewer:</strong> ${escapeHtml(input.reviewerName)}<br/>
<strong>Deadline:</strong> ${escapeHtml(input.deadline)}</p>
${cta('Open manuscript', href)}`,
        ),
      })
    })(),
  )
}

export function notifyAuthorRevisionReminder(input: {
  manuscriptId: string
  number: string
  title: string
  journalName?: string | null
  revisionDueAt: string
  kind: 'upcoming' | 'overdue'
}) {
  queue(
    (async () => {
      const author = await loadAuthor(input.manuscriptId)
      if (!author) return
      const href = appLink(`/author/submissions/${input.number}`)
      const isOverdue = input.kind === 'overdue'
      const subject = isOverdue
        ? `[${input.number}] Reminder: revision overdue`
        : `[${input.number}] Reminder: revision deadline approaching`
      const intro = isOverdue
        ? `Your revision deadline has passed (${input.revisionDueAt}). Please upload your revised manuscript as soon as possible.`
        : `Your revision deadline is approaching (${input.revisionDueAt}). Please upload your revised manuscript on time.`

      await sendMail({
        to: author.email,
        category: 'deadline',
        subject,
        text: `Dear ${author.name},

${intro}

Manuscript ID: ${input.number}
Title: ${input.title}

${href}`,
        html: emailLayout(
          isOverdue ? 'Revision overdue' : 'Revision deadline approaching',
          `<p>Dear ${escapeHtml(author.name)},</p>
<p>${escapeHtml(intro)}</p>
${manuscriptBlock(input)}
<p><strong>Revision due:</strong> ${escapeHtml(input.revisionDueAt)}</p>
${cta('Open submission', href)}`,
        ),
      })
    })(),
  )
}
