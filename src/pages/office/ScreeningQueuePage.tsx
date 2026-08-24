import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { StatusBadge } from '../../components/StatusBadge'
import {
  DataPanel,
  EmptyState,
  PageHeader,
  StatCard,
} from '../../components/ui'
import {
  fetchMyManuscripts,
  type ApiManuscript,
} from '../../lib/manuscripts'

export function ScreeningQueuePage() {
  const [manuscripts, setManuscripts] = useState<ApiManuscript[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const items = await fetchMyManuscripts()
        if (!cancelled) setManuscripts(items)
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load screening queue.',
          )
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

  const queue = useMemo(
    () =>
      manuscripts.filter((item) =>
        ['submitted', 'formatting_requested'].includes(item.status),
      ),
    [manuscripts],
  )
  const inReview = manuscripts.filter((item) => item.status === 'under_review')
  const rejected = manuscripts.filter((item) => item.status === 'rejected')

  return (
    <div className="page-stack animate-rise">
      <PageHeader
        title="Screening queue"
        description="Check scope, format, ethics, and plagiarism notes before assigning an editor."
      />

      {error ? (
        <p className="rounded-[var(--radius-lg)] bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Awaiting screening"
          value={loading ? '—' : String(queue.length)}
          accent
        />
        <StatCard
          label="With editors"
          value={loading ? '—' : String(inReview.length)}
        />
        <StatCard
          label="Desk rejected"
          value={loading ? '—' : String(rejected.length)}
        />
      </section>

      <DataPanel
        title="Technical screening"
        count={loading ? undefined : queue.length}
        size="lg"
        scroll={!loading && queue.length > 0}
      >
        {loading ? (
          <EmptyState>Loading queue…</EmptyState>
        ) : queue.length === 0 ? (
          <EmptyState>
            No manuscripts waiting for screening. When an author submits a paper,
            it will appear here.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {queue.map((item) => (
              <li key={item.id}>
                <Link to={`/office/manuscript/${item.id}`} className="list-row">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-ink-500">
                      {item.id} · {item.journal}
                    </p>
                    <p className="mt-1 truncate font-semibold text-ink-800">
                      {item.title}
                    </p>
                    <p className="mt-1 text-sm text-ink-500">
                      {item.authors} · Submitted {item.submittedAt ?? '—'}
                    </p>
                  </div>
                  <StatusBadge status={item.status} compact />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </DataPanel>
    </div>
  )
}
