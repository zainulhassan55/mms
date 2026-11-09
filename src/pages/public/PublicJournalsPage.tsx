import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PublicPageHeader } from '../../components/public/PublicPageHeader'
import { PublicSiteChrome } from '../../components/public/PublicSiteChrome'
import { apiFetch } from '../../lib/api'

export function PublicJournalsPage() {
  const [count, setCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await apiFetch<{
          ok: boolean
          journals: unknown[]
          count?: number
        }>('/api/public/journals')
        if (!cancelled) {
          setCount(
            typeof data.count === 'number' ? data.count : data.journals.length,
          )
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load')
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
    <PublicSiteChrome>
      <PublicPageHeader
        title="Journals on this platform"
        description="This page shows how many journals are currently running on MMS. Individual journal sites are not opened here — each journal uses its own submission link."
      />

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        {error ? (
          <p className="rounded-md border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
            {error}
          </p>
        ) : (
          <div className="max-w-lg rounded-xl border border-[var(--pub-line)] bg-white px-6 py-8">
            <p className="text-xs font-semibold tracking-[0.14em] text-[var(--pub-muted)] uppercase">
              Currently running
            </p>
            <p className="mt-3 font-display text-5xl font-semibold tracking-tight text-[var(--pub-ink)]">
              {loading ? '…' : count ?? 0}
            </p>
            <p className="mt-2 text-sm text-[var(--pub-muted)]">
              {loading
                ? 'Loading…'
                : count === 1
                  ? 'journal hosted on this platform'
                  : 'journals hosted on this platform'}
            </p>
            <p className="mt-6 text-sm leading-relaxed text-[var(--pub-ink-soft)]">
              Authors submit through the link provided by their journal (for
              example <span className="font-mono text-xs">/submit/journal-code</span>
              ). Journal managers request a workspace from{' '}
              <Link to="/for-editors" className="font-semibold text-[var(--pub-nav)] underline">
                For editors
              </Link>
              .
            </p>
          </div>
        )}
      </div>
    </PublicSiteChrome>
  )
}
