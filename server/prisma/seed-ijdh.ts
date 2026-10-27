/**
 * Wipe all journals/manuscripts and install International Journal of Digital Health (IJDH)
 * from Publishing Portal Data source documents.
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/auth/password.js'

const prisma = new PrismaClient()

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').trim().toLowerCase()
const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD || 'admin123'
const STAFF_PASSWORD = process.env.STAFF_SEED_PASSWORD || 'test1234'
/** Set SEED_DEMO_STAFF=true only for local demos with @test.example users. */
const SEED_DEMO_STAFF = process.env.SEED_DEMO_STAFF === 'true'

const STAFF: Array<{
  email: string
  name: string
  initials: string
  role: 'author' | 'editor' | 'reviewer' | 'copyeditor' | 'production' | 'journal_manager'
  memberRole:
    | 'author'
    | 'editor'
    | 'reviewer'
    | 'copyeditor'
    | 'production'
    | 'journal_manager'
  affiliation: string
  expertise?: string
}> = [
  {
    email: 'jm@test.example',
    name: 'Jordan Manager',
    initials: 'JM',
    role: 'journal_manager',
    memberRole: 'journal_manager',
    affiliation: 'IJDH Editorial Office',
  },
  {
    email: 'editor@test.example',
    name: 'Elena Editor',
    initials: 'EE',
    role: 'editor',
    memberRole: 'editor',
    affiliation: 'IJDH Editorial Board',
  },
  {
    email: 'reviewer@test.example',
    name: 'Riley Reviewer',
    initials: 'RR',
    role: 'reviewer',
    memberRole: 'reviewer',
    affiliation: 'Digital Health Lab',
    expertise: 'clinical AI, EHR interoperability',
  },
  {
    email: 'reviewer2@test.example',
    name: 'Sam Second',
    initials: 'SS',
    role: 'reviewer',
    memberRole: 'reviewer',
    affiliation: 'Telemedicine Institute',
    expertise: 'remote monitoring, wearables',
  },
  {
    email: 'copyeditor@test.example',
    name: 'Casey Copyeditor',
    initials: 'CC',
    role: 'copyeditor',
    memberRole: 'copyeditor',
    affiliation: 'IJDH Production Desk',
  },
  {
    email: 'production@test.example',
    name: 'Pat Production',
    initials: 'PP',
    role: 'production',
    memberRole: 'production',
    affiliation: 'IJDH Production Desk',
  },
  {
    email: 'author@test.example',
    name: 'Avery Author',
    initials: 'AA',
    role: 'author',
    memberRole: 'author',
    affiliation: 'University Hospital',
  },
]

const DESCRIPTION = `The International Journal of Digital Health (IJDH), published by NextGenIQ Press, is a peer-reviewed, open access journal dedicated to advancing research at the intersection of digital technologies, healthcare delivery, and public health.`

const POLICIES = `# International Journal of Digital Health (IJDH)

Peer-Reviewed International Journal · Open Access · Continuous Publication  
Connected care, health data, and trustworthy clinical technologies.

ISSN / eISSN / Publisher: Sample (placeholders — update when final)

---

## Aims & Scope

Health systems are being rebuilt around data, connectivity, and remote care. Electronic health records, telemedicine platforms, wearable sensors, mobile diagnostics, and clinical decision-support models now sit beside bedside practice, promising earlier detection, continuity across settings, and more personalized treatment. Those capabilities remain uneven. Design-time barriers include fragmented data models, weak interoperability across hospitals and devices, scarce labeled clinical datasets, and algorithms that fail to generalize across populations, devices, and care pathways. At runtime, digital health services must stay synchronized with evolving guidelines, integrate with legacy hospital information systems, and fail safely when connectivity, sensors, or models degrade. Privacy law, consent, cybersecurity, and the need for clinical validation further constrain what can be deployed at scale. Progress therefore depends on methods that are clinically meaningful, technically robust, and trustworthy enough for high-stakes patient care.

The International Journal of Digital Health (IJDH) is a peer-reviewed international journal that aims to provide a high-quality platform for the dissemination of innovative research in digital health. The journal focuses on emerging theories, algorithms, systems, and applications that address the evolving challenges of connected care, health data, and intelligent clinical support. IJDH welcomes original clinical and computational studies, system implementations, validation reports, datasets, surveys, and practice-oriented case studies that demonstrate safe, equitable, and interoperable digital health. The journal seeks to promote interdisciplinary collaboration among researchers, engineers, and practitioners in medicine, nursing, public health, biomedical informatics, engineering, and health services research, while fostering the development of interpretable, secure, and clinically useful digital health solutions.

### Topics

- Electronic health records, interoperability, and health information exchange
- Telemedicine, remote monitoring, and virtual care delivery
- Wearable, mobile, and ambient sensing for health assessment
- Clinical decision support and medical artificial intelligence
- Digital therapeutics, rehabilitation, and personalized intervention
- Health data standards, FHIR workflows, and semantic integration
- Privacy, consent, cybersecurity, and trustworthy digital health
- Equity, accessibility, and digital inclusion in care delivery
- Public health informatics, surveillance, and population digital health
- Human factors, clinician workflow, and patient engagement technologies
- Regulatory science, clinical validation, and real-world evidence
- Benchmarks, datasets, and evaluation methods for digital health systems

### Publication frequency

IJDH is published continuously throughout the year, with articles appearing online immediately after acceptance and production.

### Copyright & licensing

Articles published in IJDH are Open Access under **Creative Commons Attribution 4.0 International (CC BY)**. Authors retain copyright; others may download, reuse, reprint, distribute, and/or copy articles if the original authors and source are cited.

### Access policy

All articles are freely available worldwide upon publication. There are no subscription or pay-per-view fees.

### Peer review

The journal uses **single-blind** peer review. Plagiarism screening uses **Turnitin**; matching text still requires editorial judgment.

### Advertising

The journal does not accept commercial product advertisements until policy changes otherwise.

---

## Article Processing Charge (APC)

IJDH is published under a full open access model.

- The APC is completely **waived** for authors until **September 2026**.
- From **October 2026**, an APC of **USD 1,500** applies to each accepted article (editorial management, peer review, online publication, long-term preservation).
- After October 2026, authors affiliated with institutions in low-income countries are eligible for a **50% discount**.

---

## Author instructions (summary)

### Manuscript suitability

All submissions must fall within journal scope. Review Aims & Scope before submitting.

### Article types

Research Articles, Reviews, Editorials, Communications, Perspectives, Commentaries, Letters, and Reports. All papers must be written in English.

- **Research Article** — original study with Title, Keywords, Authors, Abstract, Introduction, Materials and Methods, Results, Discussion, Conclusion.
- **Review Article** — critical evaluation of published work; structured reviews/meta-analyses should follow PRISMA.
- **Editorial** — short perspectives; not formally peer-reviewed; no new research data.
- **Communication** — short reports of novel findings of immediate significance.
- **Perspective** — forward-looking expert viewpoints.
- **Commentary** — focused opinions or critiques; generally no new primary data.
- **Letter** — concise communications to the editor.
- **Report** — technical advances, datasets, case studies, benchmarks, or protocols.

### Manuscript requirements (high level)

1. **Title & authors** — title case; full names and affiliations; corresponding author marked *.
2. **Abstract** — typically 200–500 words (150–300 for some types); one continuous paragraph; no citations.
3. **Keywords** — at least three, comma-separated, lowercase unless proper nouns.
4. **Structure** — Title, authors, abstract, keywords, main text, Data Availability, Funding, Conflicts of Interest, Ethical Approval (where applicable), References, Appendix; AI usage statement if AI tools were used.
5. **Equations** — editable (Equation Editor / MathType), not images.
6. **Figures & tables** — in text after first mention; figures ≥300 dpi; consecutive Arabic numbering.
7. **Citations** — square brackets and consecutive numbers, e.g. [1], [2,3], [4–6].
8. **Declarations** — Data Availability; Funding; Conflicts of Interest; Ethical Approval and Consent (human/animal studies).

Submissions are accepted in any format; LaTeX and MS Word templates are recommended but not mandatory.

---

## Editorial process

IJDH implements rigorous **single-blind** peer review with at least two independent reviewers and a final decision by the Editor-in-Chief. Ethics follow **COPE** Best Practice Guidelines.

1. **Initial checks** — Managing Editor screens formatting, ethics, and scope. May reject or return for revision; no assessment of scientific impact at this stage.
2. **Editor-in-Chief** — may assign an Academic Editor, desk-reject, or request minor revisions before review.
3. **Academic Editor** — selects ≥2 independent reviewers; may recommend rejection or revisions.
4. **Peer review** — originality, rigor, methods, clarity, relevance; recommendations: Accept, Minor Revision, Major Revision, or Reject.
5. **Editorial decision** — Academic Editor recommends; Editor-in-Chief decides Accept / Revise / Reject.
6. **Revision** — point-by-point response letter; major revisions may be re-reviewed; typically within **30 days**.
7. **Final check** — technical/ethical review by Editorial Office; then acceptance letter.
8. **Production** — copyediting, typesetting, proofreading, and online open-access publication.

---

## Publication ethics (summary)

IJDH follows **COPE Core Practices**, **ICMJE** guidelines, and related international standards.

1. **Authorship** — ICMJE criteria; no gift/guest/ghost authorship. Authorship changes require written consent from all co-authors (office@sample.org).
2. **Complaints & appeals** — ethics@sample.org; appeals to Editor-in-Chief within 30 days of decision.
3. **Conflicts of interest** — must be disclosed by authors, editors, and reviewers; guest editors cannot handle their own submissions.
4. **Data sharing** — FAIR principles; Data Availability Statement required; retain raw data ≥5 years.
5. **Ethical oversight** — human research (Declaration of Helsinki, consent); animal research (ARRIVE and institutional approval); cell lines origin/authentication.
6. **Intellectual property** — CC BY 4.0 open access; authors retain copyright.
7. **Plagiarism & misconduct** — Turnitin screening; zero tolerance for plagiarism, fabrication, falsification.

Full ethics policy text is maintained by the publisher and enforced by trained editors.
`

const SECTIONS = [
  { code: 'research', title: 'Research Article', description: 'Original clinical or computational study', sortOrder: 1 },
  { code: 'review', title: 'Review Article', description: 'Critical evaluation of published research', sortOrder: 2 },
  { code: 'editorial', title: 'Editorial', description: 'Short personal perspectives', sortOrder: 3 },
  { code: 'communication', title: 'Communication', description: 'Short rapid reports of novel findings', sortOrder: 4 },
  { code: 'perspective', title: 'Perspective', description: 'Forward-looking expert viewpoints', sortOrder: 5 },
  { code: 'commentary', title: 'Commentary', description: 'Focused scholarly opinions or critiques', sortOrder: 6 },
  { code: 'letter', title: 'Letter', description: 'Concise communications to the editor', sortOrder: 7 },
  { code: 'report', title: 'Report', description: 'Technical advances, datasets, protocols, case studies', sortOrder: 8 },
]

const TEMPLATES = [
  {
    key: 'submission_received',
    name: 'Submission received',
    subject: 'IJDH submission received: {{number}}',
    bodyHtml:
      '<p>Dear {{authorName}},</p><p>We received your submission <strong>{{title}}</strong> ({{number}}) to the International Journal of Digital Health (IJDH).</p><p>All manuscripts undergo initial screening for scope, formatting, and ethics before peer review.</p>',
  },
  {
    key: 'reviewer_invitation',
    name: 'Reviewer invitation',
    subject: 'IJDH review invitation: {{number}}',
    bodyHtml:
      '<p>Dear {{reviewerName}},</p><p>You are invited to review <strong>{{title}}</strong> for IJDH (single-blind peer review). Deadline: {{deadline}}.</p>',
  },
  {
    key: 'editorial_decision',
    name: 'Editorial decision',
    subject: 'IJDH decision on {{number}}',
    bodyHtml:
      '<p>Dear author,</p><p>A decision has been recorded for <strong>{{title}}</strong> at IJDH: {{decision}}.</p><p>{{letter}}</p>',
  },
]

async function wipeWorkflow() {
  await prisma.$transaction([
    prisma.doiDeposit.deleteMany(),
    prisma.discussionPost.deleteMany(),
    prisma.discussionThread.deleteMany(),
    prisma.galley.deleteMany(),
    prisma.copyeditAssignment.deleteMany(),
    prisma.portalSyncEvent.deleteMany(),
    prisma.reviewReport.deleteMany(),
    prisma.reviewInvitation.deleteMany(),
    prisma.editorRecommendation.deleteMany(),
    prisma.editorialDecision.deleteMany(),
    prisma.manuscriptFile.deleteMany(),
    prisma.reviewRound.deleteMany(),
    prisma.manuscriptAuthor.deleteMany(),
    prisma.activityEvent.deleteMany(),
    prisma.manuscript.deleteMany(),
    prisma.issue.deleteMany(),
    prisma.emailTemplate.deleteMany(),
    prisma.journalSection.deleteMany(),
    prisma.journalMembership.deleteMany(),
    prisma.journal.deleteMany(),
  ])
}

async function wipeAllUsers() {
  const removed = await prisma.user.deleteMany({})
  console.log(`Removed ${removed.count} user(s).`)
}

async function main() {
  if (!ADMIN_EMAIL || !ADMIN_EMAIL.includes('@')) {
    throw new Error(
      'Set ADMIN_EMAIL in server/.env to a real address (e.g. ADMIN_EMAIL=you@gmail.com) before seeding.',
    )
  }

  console.log('Wiping all journals and workflow data…')
  await wipeWorkflow()
  console.log('Deleting ALL users (including old demo admin)…')
  await wipeAllUsers()

  const passwordHash = await hashPassword(ADMIN_PASSWORD)
  const admin = await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      name: 'Editor in Chief',
      initials: 'EIC',
      role: 'admin',
      affiliation: 'Editorial Office',
      passwordHash,
    },
  })

  console.log('Creating International Journal of Digital Health (IJDH)…')
  const journal = await prisma.journal.create({
    data: {
      code: 'ijdh',
      name: 'International Journal of Digital Health',
      issn: 'Applied for',
      description: DESCRIPTION,
      coverImageUrl: '/covers/ijdh.svg',
      subjectTags: 'Digital health',
      contactEmail: ADMIN_EMAIL,
      reviewType: 'double_blind',
      defaultReviewDays: 21,
      revisionDays: 30,
      policiesMarkdown: POLICIES,
      sections: { create: SECTIONS },
      emailTemplates: { create: TEMPLATES },
      memberships: {
        create: { userId: admin.id, role: 'journal_manager' },
      },
    },
  })

  if (SEED_DEMO_STAFF) {
    const staffHash = await hashPassword(STAFF_PASSWORD)
    console.log('Enrolling demo staff on IJDH (SEED_DEMO_STAFF=true)…')
    for (const item of STAFF) {
      const user = await prisma.user.create({
        data: {
          email: item.email,
          name: item.name,
          initials: item.initials,
          role: item.role,
          affiliation: item.affiliation,
          expertise: item.expertise ?? null,
          passwordHash: staffHash,
          memberships: {
            create: {
              journalId: journal.id,
              role: item.memberRole,
            },
          },
        },
      })
      console.log(`  ${user.role.padEnd(16)} ${user.email}`)
    }
  } else {
    console.log('Skipped demo staff — users will self-register with real emails.')
  }

  console.log('Done.')
  console.log(`Journal: ${journal.name} (${journal.code})`)
  console.log(`Public URL path: /mms/j/ijdh`)
  console.log(`Editor in Chief (admin): ${ADMIN_EMAIL}`)
  console.log('(Password = ADMIN_SEED_PASSWORD from .env)')
  console.log('Policies loaded from IJDH About, APC, Author Instruction, Editorial Process, Publication Ethics.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
