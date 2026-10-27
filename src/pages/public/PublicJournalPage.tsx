import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { apiFetch } from '../../lib/api'
import { BrandMark } from '../../components/BrandMark'
import { JournalCover } from '../../components/JournalCover'
import { MarkdownContent } from '../../components/MarkdownContent'

type PublicJournal = {
  code: string
  name: string
  issn: string | null
  description: string | null
  coverImageUrl?: string | null
  contactEmail: string | null
  reviewType: string | null
  defaultReviewDays: number | null
  revisionDays: number | null
  policiesMarkdown: string | null
  sections: Array<{
    id: string
    code: string
    title: string
    description: string | null
  }>
}

type PublicIssue = {
  id: string
  volume: string
  number: string
  year: number
  title: string | null
  publishedAt: string | null
  manuscripts: Array<{
    number: string
    title: string
    authorsText: string
    doi: string | null
    abstract: string | null
    galleys: Array<{ id: string; label: string; format: string; fileName: string }>
  }>
}

type TabId =
  | 'home'
  | 'about'
  | 'authors'
  | 'apc'
  | 'editorial'
  | 'ethics'
  | 'current'
  | 'sections'

const TAB_DEFS: Array<{ id: TabId; label: string }> = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'authors', label: 'Author instructions' },
  { id: 'apc', label: 'APC' },
  { id: 'editorial', label: 'Editorial process' },
  { id: 'ethics', label: 'Publication ethics' },
  { id: 'current', label: 'Current issue' },
  { id: 'sections', label: 'Sections' },
]

export function PublicJournalPage() {
  const { code = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [journal, setJournal] = useState<PublicJournal | null>(null)
  const [issue, setIssue] = useState<PublicIssue | null>(null)
  const [error, setError] = useState<string | null>(null)

  const activeTab = (searchParams.get('tab') as TabId) || 'home'

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [j, current] = await Promise.all([
          apiFetch<{ ok: boolean; journal: PublicJournal }>(
            `/api/public/journals/${code}`,
          ),
          apiFetch<{ ok: boolean; issue: PublicIssue | null }>(
            `/api/public/journals/${code}/current-issue`,
          ),
        ])
        if (cancelled) return
        setJournal(j.journal)
        setIssue(current.issue)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load journal')
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [code])

  const policySections = useMemo(
    () => splitPolicySections(journal?.policiesMarkdown ?? ''),
    [journal?.policiesMarkdown],
  )

  function setTab(tab: TabId) {
    setSearchParams(tab === 'home' ? {} : { tab })
  }

  if (error) {
    return (
      <div className="min-h-screen bg-paper px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <p className="text-rose-600">{error}</p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm font-medium">
            <Link to="/" className="text-signal-700">
              All journals
            </Link>
            <Link to="/login" className="text-signal-700">
              Login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!journal) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper text-ink-500">
        Loading journal…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper text-ink-800">
      <header className="sticky top-0 z-30 border-b border-line bg-paper-elevated/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <Link to={`/j/${journal.code}`} className="min-h-10" onClick={() => setTab('home')}>
            {/* dark mark on light header — light mark was invisible / looked clipped */}
            <BrandMark variant="dark" size="sm" />
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link
              to="/"
              className="hidden font-medium text-ink-500 hover:text-ink-800 sm:inline"
            >
              All journals
            </Link>
            <span className="hidden text-ink-400 sm:inline">
              {journal.code.toUpperCase()}
            </span>
            <Link
              to="/register"
              className="font-medium text-ink-600 hover:text-ink-800"
            >
              Register
            </Link>
            <Link to="/login" className="font-semibold text-signal-700 hover:text-signal-800">
              Login
            </Link>
          </div>
        </div>
      </header>

      <div className="border-b border-line bg-gradient-to-br from-[#0f5c56] via-[#11756c] to-[#0d4f4a] text-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-end sm:gap-8 sm:px-6 sm:py-12">
          <JournalCover
            code={journal.code}
            name={journal.name}
            coverImageUrl={journal.coverImageUrl}
            className="w-[6.5rem] ring-white/20 sm:w-[7.5rem]"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[0.72rem] font-semibold tracking-[0.16em] text-white/70 uppercase">
              Peer-reviewed · Open access · Continuous publication
              {journal.issn ? ` · ISSN ${journal.issn}` : ''}
            </p>
            <h1 className="mt-3 max-w-3xl font-display text-[2.1rem] leading-[1.12] font-semibold tracking-tight sm:text-[2.75rem]">
              {journal.name}
            </h1>
            <p className="mt-4 max-w-2xl text-[0.98rem] leading-relaxed text-white/85">
              {journal.description}
            </p>
            <div className="mt-5 flex flex-wrap gap-3 text-sm text-white/75">
              {journal.reviewType ? (
                <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15">
                  {formatReviewType(journal.reviewType)} peer review
                </span>
              ) : null}
              {journal.contactEmail ? (
                <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15">
                  {journal.contactEmail}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <nav
        className="sticky top-[3.6rem] z-20 border-b border-line bg-paper-elevated"
        aria-label="Journal sections"
      >
        <div className="mx-auto max-w-5xl px-2 sm:px-4">
          <ul className="flex gap-0.5 overflow-x-auto py-2">
            {TAB_DEFS.map((tab) => {
              const selected = activeTab === tab.id
              return (
                <li key={tab.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setTab(tab.id)}
                    className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
                      selected
                        ? 'bg-signal-50 text-signal-800 ring-1 ring-signal-100'
                        : 'text-ink-500 hover:bg-paper-soft hover:text-ink-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        {activeTab === 'home' ? (
          <HomePanel
            journal={journal}
            issue={issue}
            code={code}
            onOpenTab={setTab}
            aboutPreview={policySections.about}
          />
        ) : null}

        {activeTab === 'about' ? (
          <PolicyPanel
            title="About the journal"
            markdown={
              policySections.about ||
              journal.description ||
              'No about information has been published yet.'
            }
          />
        ) : null}

        {activeTab === 'authors' ? (
          <PolicyPanel
            title="Author instructions"
            markdown={
              policySections.authors ||
              'Author instructions will appear here once published by the journal manager.'
            }
          />
        ) : null}

        {activeTab === 'apc' ? (
          <PolicyPanel
            title="Article processing charge"
            markdown={
              policySections.apc ||
              'APC information will appear here once published by the journal manager.'
            }
          />
        ) : null}

        {activeTab === 'editorial' ? (
          <PolicyPanel
            title="Editorial process"
            markdown={
              policySections.editorial ||
              'Editorial process details will appear here once published.'
            }
          />
        ) : null}

        {activeTab === 'ethics' ? (
          <PolicyPanel
            title="Publication ethics"
            markdown={
              policySections.ethics ||
              'Publication ethics policy will appear here once published.'
            }
          />
        ) : null}

        {activeTab === 'current' ? (
          <CurrentIssuePanel issue={issue} code={code} />
        ) : null}

        {activeTab === 'sections' ? (
          <SectionsPanel sections={journal.sections} />
        ) : null}
      </main>

      <footer className="border-t border-line bg-paper-soft">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-6 text-sm text-ink-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © {new Date().getFullYear()} {journal.name}
          </p>
          <p>
            {journal.contactEmail ? (
              <>
                Contact{' '}
                <a
                  className="font-medium text-signal-700"
                  href={`mailto:${journal.contactEmail}`}
                >
                  {journal.contactEmail}
                </a>
              </>
            ) : (
              'Open-access scholarly journal'
            )}
          </p>
        </div>
      </footer>
    </div>
  )
}

function HomePanel({
  journal,
  issue,
  code,
  onOpenTab,
  aboutPreview,
}: {
  journal: PublicJournal
  issue: PublicIssue | null
  code: string
  onOpenTab: (tab: TabId) => void
  aboutPreview: string
}) {
  const aimsText = extractAimsBody(aboutPreview) || journal.description || ''

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <section className="rounded-[var(--radius-lg)] border border-line bg-paper-elevated p-5 sm:p-7">
        <p className="text-[0.7rem] font-semibold tracking-[0.14em] text-signal-700 uppercase">
          Aims & scope
        </p>
        <h2 className="mt-2 font-display text-[1.45rem] leading-snug font-semibold tracking-tight text-ink-800 sm:text-[1.65rem]">
          {journal.name}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-500">
          Peer-reviewed international journal · Open access · Continuous
          publication
        </p>
        <div className="mt-5 border-t border-line pt-5">
          <MarkdownContent source={aimsText} compact />
        </div>
        <div className="mt-5 border-t border-line pt-4">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => onOpenTab('about')}
          >
            Read full about page
          </button>
        </div>
      </section>

      <section className="rounded-[var(--radius-lg)] border border-line bg-paper-elevated p-5 sm:p-6">
        <h3 className="text-[0.7rem] font-semibold tracking-[0.14em] text-ink-500 uppercase">
          At a glance
        </h3>
        <dl className="mt-4 space-y-0 divide-y divide-line text-sm">
          <MetaRow label="Review model" value={formatReviewType(journal.reviewType)} />
          <MetaRow
            label="Default review window"
            value={
              journal.defaultReviewDays
                ? `${journal.defaultReviewDays} days`
                : '—'
            }
          />
          <MetaRow
            label="Revision window"
            value={journal.revisionDays ? `${journal.revisionDays} days` : '—'}
          />
          <MetaRow label="ISSN" value={journal.issn || '—'} />
          <MetaRow label="Access" value="Open access (CC BY)" />
        </dl>
      </section>

      <section className="rounded-[var(--radius-lg)] border border-signal-100 bg-signal-50 p-5 sm:p-6">
        <h3 className="font-display text-lg font-semibold text-signal-900">
          For authors
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-justify text-ink-600">
          Review author instructions and the article processing charge policy
          before preparing your manuscript for IJDH.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className="btn btn-signal"
            onClick={() => onOpenTab('authors')}
          >
            Author instructions
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => onOpenTab('apc')}
          >
            APC
          </button>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <h2 className="font-display text-xl font-semibold text-ink-800">
            Current issue
          </h2>
          <button
            type="button"
            className="text-sm font-semibold text-signal-700"
            onClick={() => onOpenTab('current')}
          >
            View all
          </button>
        </div>
        <CurrentIssuePanel issue={issue} code={code} compact />
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <h2 className="font-display text-xl font-semibold text-ink-800">
            Article types
          </h2>
          <button
            type="button"
            className="text-sm font-semibold text-signal-700"
            onClick={() => onOpenTab('sections')}
          >
            All sections
          </button>
        </div>
        <SectionsPanel sections={journal.sections.slice(0, 6)} />
      </section>
    </div>
  )
}

function PolicyPanel({ title, markdown }: { title: string; markdown: string }) {
  return (
    <article className="rounded-[var(--radius-lg)] border border-line bg-paper-elevated p-5 sm:p-8">
      <h2 className="font-display text-2xl font-semibold tracking-tight text-ink-800">
        {title}
      </h2>
      <div className="mt-6 max-w-none">
        <MarkdownContent source={markdown} />
      </div>
    </article>
  )
}

/** Keep only the aims narrative for the home card (no duplicate titles / topics list). */
function extractAimsBody(markdown: string) {
  if (!markdown.trim()) return ''
  let text = markdown
  const aimsMatch = text.match(/##\s+Aims\s*&\s*Scope\s*([\s\S]*?)(?=\n##\s|\n###\s+Topics|$)/i)
  if (aimsMatch?.[1]) {
    text = aimsMatch[1].trim()
  } else {
    text = text
      .replace(/^#\s+.+$/m, '')
      .replace(/^##\s+Aims\s*&\s*Scope\s*$/im, '')
      .split(/\n###\s+Topics/i)[0]
      .trim()
  }
  // Drop imprint / placeholder lines from the cover block
  return text
    .split('\n')
    .filter(
      (line) =>
        !/ISSN|eISSN|Publisher|placeholders|Cover and imprint/i.test(line) &&
        !/^Peer-Reviewed International Journal/i.test(line.trim()) &&
        !/^Open Access/i.test(line.trim()) &&
        !/^Connected care/i.test(line.trim()),
    )
    .join('\n')
    .trim()
}

function CurrentIssuePanel({
  issue,
  code,
  compact = false,
}: {
  issue: PublicIssue | null
  code: string
  compact?: boolean
}) {
  if (!issue) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-dashed border-line bg-paper-soft px-5 py-8 text-sm text-ink-500">
        No published issue yet. Articles appear here after production publishes an
        issue.
      </div>
    )
  }

  const items = compact ? issue.manuscripts.slice(0, 4) : issue.manuscripts

  return (
    <div className="rounded-[var(--radius-lg)] border border-line bg-paper-elevated">
      <div className="border-b border-line px-5 py-4">
        <p className="font-semibold text-ink-800">
          Vol. {issue.volume} · No. {issue.number} · {issue.year}
          {issue.title ? ` — ${issue.title}` : ''}
        </p>
      </div>
      <ol className="divide-y divide-line">
        {items.map((article, index) => (
          <li key={article.number} className="px-5 py-4">
            <p className="text-xs font-semibold tracking-wide text-ink-300">
              {String(index + 1).padStart(2, '0')}
            </p>
            <Link
              to={`/j/${code}/article/${article.number}`}
              className="mt-1 block font-display text-lg font-semibold tracking-tight text-ink-800 hover:text-signal-700"
            >
              {article.title}
            </Link>
            <p className="mt-1 text-sm text-ink-500">{article.authorsText}</p>
            {article.doi ? (
              <p className="mt-1 text-xs text-ink-400">DOI {article.doi}</p>
            ) : null}
            {!compact && article.abstract ? (
              <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-600">
                {article.abstract}
              </p>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  )
}

function SectionsPanel({
  sections,
}: {
  sections: PublicJournal['sections']
}) {
  if (!sections.length) {
    return (
      <p className="text-sm text-ink-500">No sections configured for this journal.</p>
    )
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {sections.map((s) => (
        <li
          key={s.id}
          className="rounded-[var(--radius-lg)] border border-line bg-paper-elevated px-4 py-4"
        >
          <p className="font-semibold text-ink-800">{s.title}</p>
          <p className="mt-1 text-xs font-semibold tracking-wide text-ink-400 uppercase">
            {s.code}
          </p>
          {s.description ? (
            <p className="mt-2 text-sm text-ink-500">{s.description}</p>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
      <dt className="shrink-0 text-ink-500">{label}</dt>
      <dd className="text-right font-semibold capitalize text-ink-800">{value}</dd>
    </div>
  )
}

function formatReviewType(value: string | null | undefined) {
  if (!value) return '—'
  return value.replace(/_/g, ' ')
}

/** Split policiesMarkdown into tab-sized chunks by known ## headings. */
function splitPolicySections(markdown: string) {
  const empty = {
    about: '',
    apc: '',
    authors: '',
    editorial: '',
    ethics: '',
  }
  if (!markdown.trim()) return empty

  const markers: Array<{ key: keyof typeof empty; pattern: RegExp }> = [
    { key: 'apc', pattern: /\n##\s+Article Processing Charge[^\n]*/i },
    { key: 'authors', pattern: /\n##\s+Author instructions?[^\n]*/i },
    { key: 'editorial', pattern: /\n##\s+Editorial process[^\n]*/i },
    { key: 'ethics', pattern: /\n##\s+Publication ethics[^\n]*/i },
  ]

  const positions = markers
    .map((m) => {
      const match = markdown.match(m.pattern)
      return match && match.index != null
        ? { key: m.key, index: match.index + 1 }
        : null
    })
    .filter(Boolean) as Array<{ key: keyof typeof empty; index: number }>

  positions.sort((a, b) => a.index - b.index)

  const result = { ...empty }
  if (positions.length === 0) {
    result.about = markdown.trim()
    return result
  }

  result.about = markdown.slice(0, positions[0].index).trim()
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].index
    const end = positions[i + 1]?.index ?? markdown.length
    result[positions[i].key] = markdown.slice(start, end).trim()
  }
  return result
}

export function PublicArticlePage() {
  const { number = '', code = '' } = useParams()
  const [article, setArticle] = useState<{
    number: string
    title: string
    abstract: string | null
    doi: string | null
    authors: Array<{ name: string; affiliation: string | null; orcid: string | null }>
    journal: { code: string; name: string }
    volume: string | null
    issueNumber: string | null
    galleys: Array<{ id: string; label: string; format: string; fileName: string }>
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void apiFetch<{ ok: boolean; article: NonNullable<typeof article> }>(
      `/api/public/articles/${number}`,
    )
      .then((data) => setArticle(data.article))
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Article not found'),
      )
  }, [number])

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-rose-600">{error}</div>
    )
  }
  if (!article) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-ink-500">Loading…</div>
    )
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-paper-elevated">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3.5">
          <Link to={`/j/${article.journal.code || code}`} className="min-h-10">
            <BrandMark variant="dark" size="sm" />
          </Link>
          <Link
            to={`/j/${article.journal.code || code}`}
            className="text-sm font-semibold text-signal-700"
          >
            Back to journal
          </Link>
        </div>
      </header>
      <article className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-xs font-semibold tracking-wide text-ink-400 uppercase">
          {article.number}
          {article.volume ? ` · Vol. ${article.volume}` : ''}
          {article.issueNumber ? ` No. ${article.issueNumber}` : ''}
        </p>
        <h1 className="mt-2 font-display text-[2rem] leading-[1.15] font-semibold tracking-tight text-ink-800 sm:text-[2.4rem]">
          {article.title}
        </h1>
        <ul className="mt-4 space-y-1">
          {article.authors.map((a) => (
            <li key={a.name} className="text-sm text-ink-600">
              <span className="font-medium text-ink-800">{a.name}</span>
              {a.affiliation ? ` — ${a.affiliation}` : ''}
              {a.orcid ? (
                <span className="block text-xs text-ink-400">ORCID {a.orcid}</span>
              ) : null}
            </li>
          ))}
        </ul>
        {article.doi ? (
          <p className="mt-3 text-sm text-ink-500">DOI {article.doi}</p>
        ) : null}

        {article.abstract ? (
          <section className="mt-10">
            <h2 className="text-sm font-semibold tracking-wide text-ink-500 uppercase">
              Abstract
            </h2>
            <p className="mt-3 whitespace-pre-wrap leading-relaxed text-ink-700">
              {article.abstract}
            </p>
          </section>
        ) : null}

        {article.galleys.length > 0 ? (
          <section className="mt-10">
            <h2 className="text-sm font-semibold tracking-wide text-ink-500 uppercase">
              Full text
            </h2>
            <ul className="mt-3 space-y-2">
              {article.galleys.map((g) => (
                <li
                  key={g.id}
                  className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-line bg-paper-elevated px-4 py-3 text-sm"
                >
                  <span className="font-medium text-ink-800">
                    {g.label}
                    <span className="font-normal text-ink-400">
                      {' '}
                      · {g.format.toUpperCase()}
                    </span>
                  </span>
                  <span className="text-ink-500">{g.fileName}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </article>
    </div>
  )
}
