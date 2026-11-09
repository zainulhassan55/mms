import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { PublicPageHeader } from '../../components/public/PublicPageHeader'
import { PublicSiteChrome } from '../../components/public/PublicSiteChrome'
import { apiFetch } from '../../lib/api'

type PublicJournal = {
  code: string
  name: string
  description: string | null
}

export function PublicSubmitGatewayPage() {
  const { code = '' } = useParams()
  const { isAuthenticated, user } = useAuth()
  const [journal, setJournal] = useState<PublicJournal | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const normalized = code.trim().toLowerCase()
  const submitPath = `/author/submissions/new?journal=${encodeURIComponent(normalized)}`
  const loginPath = `/login?next=${encodeURIComponent(submitPath)}&journal=${encodeURIComponent(normalized)}`
  const registerPath = `/register?next=${encodeURIComponent(submitPath)}&journal=${encodeURIComponent(normalized)}&role=author`

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await apiFetch<{ ok: boolean; journal: PublicJournal }>(
          `/api/public/journals/${encodeURIComponent(normalized)}`,
        )
        if (!cancelled) setJournal(data.journal)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Journal not found')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (normalized) void load()
    return () => {
      cancelled = true
    }
  }, [normalized])

  if (!loading && journal && isAuthenticated && user?.role === 'author') {
    return <Navigate to={submitPath} replace />
  }

  return (
    <PublicSiteChrome>
      <PublicPageHeader
        title="Submit a manuscript"
        description={
          journal
            ? `You are submitting to ${journal.name}. Sign in or create an author account to continue.`
            : 'Open a journal submission link to continue.'
        }
      />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        {loading ? (
          <p className="text-sm text-[var(--pub-muted)]">Loading journal…</p>
        ) : error ? (
          <p className="rounded-md border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
            {error}
          </p>
        ) : journal ? (
          <div className="max-w-xl rounded-xl border border-[var(--pub-line)] bg-white p-6">
            <p className="text-xs font-semibold tracking-wide text-[var(--pub-muted)] uppercase">
              Journal
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-[var(--pub-ink)]">
              {journal.name}
            </h2>
            <p className="mt-1 text-sm text-[var(--pub-muted)]">
              Code: {journal.code.toUpperCase()}
            </p>
            {journal.description ? (
              <p className="mt-3 text-sm leading-relaxed text-[var(--pub-ink-soft)]">
                {journal.description}
              </p>
            ) : null}

            {isAuthenticated && user?.role !== 'author' ? (
              <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-900">
                You are signed in as <strong>{user?.role}</strong>. Manuscript
                submission needs a separate <strong>author</strong> account for
                this journal. Sign out, then register or log in as an author.
              </div>
            ) : (
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to={loginPath}
                  className="inline-flex rounded-md bg-[var(--pub-nav)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--pub-nav-deep)]"
                >
                  Log in to submit
                </Link>
                <Link
                  to={registerPath}
                  className="inline-flex rounded-md border border-[var(--pub-line)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--pub-ink)] hover:bg-[var(--pub-page)]"
                >
                  Register as author
                </Link>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </PublicSiteChrome>
  )
}
