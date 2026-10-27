import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { BrandMark } from '../../components/BrandMark'
import { JournalCover } from '../../components/JournalCover'
import { apiFetch } from '../../lib/api'

type CatalogJournal = {
  code: string
  name: string
  issn: string | null
  description: string | null
  coverImageUrl?: string | null
  subjectTags?: string | null
  reviewType?: string | null
}

export function PublicHomePage() {
  const { isAuthenticated } = useAuth()
  const [journals, setJournals] = useState<CatalogJournal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await apiFetch<{ ok: boolean; journals: CatalogJournal[] }>(
          '/api/public/journals',
        )
        if (!cancelled) setJournals(data.journals)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load journals')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-screen bg-paper text-ink-800">
      <header className="sticky top-0 z-30 border-b border-line bg-paper-elevated/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <Link to="/" className="min-h-10">
            <BrandMark variant="dark" size="sm" />
          </Link>
          <div className="flex items-center gap-3 text-sm">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="font-semibold text-signal-700 hover:text-signal-800"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="font-medium text-ink-600 hover:text-ink-800"
                >
                  Register
                </Link>
                <Link
                  to="/login"
                  className="font-semibold text-signal-700 hover:text-signal-800"
                >
                  Login
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="border-b border-line bg-gradient-to-br from-[#0f5c56] via-[#11756c] to-[#0d4f4a] text-white">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
          <p className="text-[0.72rem] font-semibold tracking-[0.16em] text-white/70 uppercase">
            Peer-reviewed · Open access · Continuous publication
          </p>
          <h1 className="mt-3 max-w-3xl font-display text-[2.1rem] leading-[1.12] font-semibold tracking-tight sm:text-[2.75rem]">
            Journals
          </h1>
          <p className="mt-4 max-w-2xl text-[0.98rem] leading-relaxed text-white/85">
            Browse our journals, read current issues, and submit a manuscript
            after signing in.
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-xl font-semibold text-ink-800">
            All journals
          </h2>
          <span className="text-xs font-medium text-ink-400">
            {loading
              ? '…'
              : `${journals.length} journal${journals.length === 1 ? '' : 's'}`}
          </span>
        </div>

        {error ? (
          <p className="mt-6 rounded-md bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="mt-8 text-sm text-ink-500">Loading journals…</p>
        ) : journals.length === 0 ? (
          <p className="mt-8 text-sm text-ink-500">
            No journals are published on this site yet.
          </p>
        ) : (
          <div className="mt-6">
            <div className="hidden grid-cols-[5.25rem_minmax(0,1fr)_4.5rem_7rem_6.5rem] gap-5 border-b border-line px-1 pb-2 text-[0.65rem] font-semibold tracking-wide text-ink-400 uppercase sm:grid">
              <span>Cover</span>
              <span>Journal</span>
              <span>Code</span>
              <span>ISSN</span>
              <span className="text-right">Actions</span>
            </div>

            <ul className="divide-y divide-line border-b border-line">
              {journals.map((journal) => {
                const tags = catalogTags(journal)
                const submitTo = isAuthenticated
                  ? `/author/submissions/new?journal=${encodeURIComponent(journal.code)}`
                  : `/login?next=${encodeURIComponent(`/author/submissions/new?journal=${journal.code}`)}`
                return (
                  <li
                    key={journal.code}
                    className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-4 py-5 sm:grid-cols-[5.25rem_minmax(0,1fr)_4.5rem_7rem_6.5rem] sm:items-start sm:gap-5"
                  >
                    <Link to={`/j/${journal.code}`} className="block">
                      <JournalCover
                        code={journal.code}
                        name={journal.name}
                        coverImageUrl={journal.coverImageUrl}
                      />
                    </Link>

                    <div className="min-w-0">
                      <Link
                        to={`/j/${journal.code}`}
                        className="font-display text-lg font-semibold text-ink-800 hover:text-signal-800"
                      >
                        {journal.name}
                      </Link>
                      {journal.description ? (
                        <p className="mt-1.5 text-sm leading-relaxed text-ink-500 text-pretty">
                          {journal.description}
                        </p>
                      ) : null}
                      {tags.length > 0 ? (
                        <ul className="mt-3 flex flex-wrap gap-2">
                          {tags.map((tag) => (
                            <li
                              key={tag.label}
                              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ring-1 ${tag.className}`}
                            >
                              {tag.dot ? (
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${tag.dot}`}
                                  aria-hidden
                                />
                              ) : null}
                              {tag.label}
                            </li>
                          ))}
                        </ul>
                      ) : null}

                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm sm:hidden">
                        <span className="text-ink-400">
                          <span className="font-semibold tracking-wide uppercase">
                            Code
                          </span>{' '}
                          {journal.code.toUpperCase()}
                        </span>
                        <span className="text-ink-400">
                          <span className="font-semibold tracking-wide uppercase">
                            ISSN
                          </span>{' '}
                          {formatIssn(journal.issn)}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-col gap-1 sm:hidden">
                        <Link
                          to={`/j/${journal.code}`}
                          className="text-sm font-semibold text-signal-700"
                        >
                          Journal home
                        </Link>
                        <Link
                          to={submitTo}
                          className="text-sm font-semibold text-signal-700"
                        >
                          Submit
                        </Link>
                      </div>
                    </div>

                    <p className="hidden pt-1 text-sm font-medium text-ink-500 sm:block">
                      {journal.code.toUpperCase()}
                    </p>
                    <p className="hidden pt-1 text-sm font-medium text-ink-500 sm:block">
                      {formatIssn(journal.issn)}
                    </p>
                    <div className="hidden flex-col items-end gap-1.5 pt-1 text-sm font-semibold text-signal-700 sm:flex">
                      <Link
                        to={`/j/${journal.code}`}
                        className="hover:text-signal-800"
                      >
                        Journal home
                      </Link>
                      <Link to={submitTo} className="hover:text-signal-800">
                        Submit
                      </Link>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </main>
    </div>
  )
}

function formatIssn(issn: string | null | undefined) {
  if (!issn || /^sample$/i.test(issn.trim())) return 'Applied for'
  return issn
}

function formatReviewType(value: string | null | undefined) {
  if (!value) return null
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('-')
}

function catalogTags(journal: CatalogJournal) {
  const tags: Array<{
    label: string
    className: string
    dot?: string
  }> = []

  for (const raw of (journal.subjectTags ?? '').split(',')) {
    const label = raw.trim()
    if (!label) continue
    tags.push({
      label,
      className: 'bg-paper text-ink-600 ring-line',
      dot: 'bg-signal-600',
    })
  }

  tags.push({
    label: 'Open access',
    className: 'bg-amber-50 text-amber-900 ring-amber-100',
  })

  const review = formatReviewType(journal.reviewType)
  if (review) {
    tags.push({
      label: review,
      className: 'bg-paper text-ink-600 ring-line',
    })
  }

  return tags
}
