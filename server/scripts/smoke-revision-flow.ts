/**
 * Smoke: second manuscript through minor_revision → resubmit → accept → copyedit → production ready.
 * Also backfills DOI on MS-2026-0001 if missing.
 */
import { PrismaClient } from '@prisma/client'

const base = process.env.API_BASE || 'http://localhost:4000'
const prisma = new PrismaClient()

async function login(email: string, password: string) {
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = (await res.json()) as { ok?: boolean; token?: string; error?: string }
  if (!res.ok || !data.token) throw new Error(data.error || `Login failed for ${email}`)
  return data.token
}

async function api(
  method: string,
  path: string,
  token: string,
  body?: unknown,
) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(`${method} ${path}: ${(data as { error?: string }).error || res.statusText}`)
  }
  return data as Record<string, any>
}

async function main() {
  const published = await prisma.manuscript.findUnique({
    where: { number: 'MS-2026-0001' },
  })
  if (published && !published.doi) {
    await prisma.manuscript.update({
      where: { id: published.id },
      data: { doi: '10.0000/ijdh.2026.1.1.001' },
    })
    console.log('Backfilled DOI on MS-2026-0001')
  }

  const pub = await fetch(`${base}/api/public/journals/ijdh`).then((r) => r.json()) as {
    journal: { sections: Array<{ id: string }> }
  }
  const sectionId = pub.journal.sections[0].id

  const authorTok = await login('author@test.example', 'test1234')
  const created = await api('POST', '/api/manuscripts', authorTok, {
    status: 'submitted',
    title: 'FHIR-based remote monitoring for heart failure',
    journalCode: 'ijdh',
    sectionId,
    articleType: 'Research Article',
    abstract:
      'A FHIR workflow for remote monitoring reduces readmissions in a multi-site pilot.',
    keywords: 'FHIR, remote monitoring, heart failure',
    specialIssue: null,
    authors: [
      {
        name: 'Avery Author',
        email: 'author@test.example',
        affiliation: 'University Hospital',
        corresponding: true,
      },
    ],
  })
  const num = created.manuscript.id as string
  console.log('Submitted', num)

  const edTok = await login('editor@test.example', 'test1234')
  const editors = await api('GET', '/api/editors', edTok)
  const editorId = editors.editors.find(
    (e: { email: string }) => e.email === 'editor@test.example',
  ).id
  await api('POST', `/api/manuscripts/${num}/screening`, edTok, {
    action: 'pass',
    editorId,
    notes: 'In scope',
  })
  console.log('Screened')

  const revs = await api('GET', '/api/reviewers', edTok)
  const revId = revs.reviewers.find(
    (r: { email: string }) => r.email === 'reviewer2@test.example',
  ).id
  const inv = await api('POST', `/api/manuscripts/${num}/invitations`, edTok, {
    reviewerId: revId,
    deadlineDays: 14,
  })
  console.log('Invited', inv.invitation.reviewerName)

  const revTok = await login('reviewer2@test.example', 'test1234')
  await api('POST', `/api/invitations/${inv.invitation.id}/respond`, revTok, {
    response: 'accepted',
  })
  await api('POST', `/api/invitations/${inv.invitation.id}/review`, revTok, {
    summary: 'Useful FHIR pilot; needs clearer outcome metrics.',
    strengths: 'Real-world deployment evidence.',
    weaknesses: 'Primary endpoint under-specified.',
    commentsToAuthor: 'Clarify endpoints and sample size justification.',
    commentsToEditor: 'Minor revision.',
    recommendation: 'minor_revision',
    originality: 4,
    methodology: 3,
    clarity: 3,
  })
  console.log('Review in')

  await api('POST', `/api/manuscripts/${num}/decision`, edTok, {
    decision: 'minor_revision',
    letter: 'Please address the reviewer comments and resubmit within 21 days.',
    revisionDays: 21,
  })
  console.log('Revision requested')

  // Author revision without binary upload (fileName only)
  await api('POST', `/api/manuscripts/${num}/revision`, authorTok, {
    responseLetter:
      'We clarified the primary endpoint (30-day readmission) and added power calculation.',
    fileName: `${num}-R1.docx`,
    reinvitePreviousReviewers: true,
  })
  console.log('Revision submitted')

  const detail = await api('GET', `/api/manuscripts/${num}`, edTok)
  console.log('After revision status=', detail.manuscript.status, 'v=', detail.manuscript.version)

  // Second-round review then accept
  const invs = await api('GET', '/api/invitations', revTok)
  const open = invs.invitations.find(
    (i: { manuscriptId: string; status: string; review?: unknown }) =>
      i.manuscriptId === num && (i.status === 'sent' || i.status === 'accepted') && !i.review,
  )
  if (open) {
    if (open.status === 'sent') {
      await api('POST', `/api/invitations/${open.id}/respond`, revTok, {
        response: 'accepted',
      })
    }
    await api('POST', `/api/invitations/${open.id}/review`, revTok, {
      summary: 'Concerns addressed.',
      strengths: 'Clear endpoints now.',
      weaknesses: 'None major.',
      commentsToAuthor: 'Ready for acceptance.',
      commentsToEditor: 'Accept.',
      recommendation: 'accept',
      originality: 4,
      methodology: 4,
      clarity: 4,
    })
    console.log('Round 2 review in')
  } else {
    console.log('No open re-invite; deciding with existing reviews')
  }

  await api('POST', `/api/manuscripts/${num}/decision`, edTok, {
    decision: 'accept',
    letter: 'Accepted after revision. Proceeding to copyediting.',
  })
  console.log('Accepted → copyediting')

  const users = await api('GET', '/api/users', edTok)
  const ceId = users.users.find(
    (u: { email: string }) => u.email === 'copyeditor@test.example',
  ).id
  const assign = await api('POST', `/api/workflow/${num}/copyedit/assign`, edTok, {
    copyeditorId: ceId,
  })
  const ceTok = await login('copyeditor@test.example', 'test1234')
  await api('PATCH', `/api/workflow/${num}/copyedit/${assign.assignment.id}`, ceTok, {
    status: 'approved',
    cleanFileName: `${num}-clean.docx`,
  })
  await api('POST', `/api/manuscripts/${num}/production/start`, edTok, {
    notes: 'Editor/JM handoff to production',
  })
  const after = await api('GET', `/api/manuscripts/${num}`, edTok)
  console.log('Final status=', after.manuscript.status)
  console.log('REVISION_FLOW_OK', num)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
