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
  fetchProductionQueue,
  type ApiManuscript,
} from '../../lib/manuscripts'

export function ProductionQueuePage() {
  const [manuscripts, setManuscripts] = useState<ApiManuscript[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const items = await fetchProductionQueue()
        if (!cancelled) setManuscripts(items)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load queue.')
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

  const accepted = useMemo(
    () => manuscripts.filter((item) => item.status === 'accepted').length,
    [manuscripts],
  )
  const inProd = useMemo(
    () => manuscripts.filter((item) => item.status === 'in_production').length,
    [manuscripts],
  )
  const awaitingProof = useMemo(
    () => manuscripts.filter((item) => item.status === 'proof_sent').length,
    [manuscripts],
  )
  const ready = useMemo(
    () =>
      manuscripts.filter((item) => item.status === 'ready_for_publication')
        .length,
    [manuscripts],
  )

  return (
    <div className="page-stack animate-rise">
      <PageHeader
        title="Production queue"
        description="OJS production stage: after copyediting is approved (or Accept with no copyedit assignment), start layout, proofs, galleys, and issue scheduling."
      />

      {error ? (
        <p className="rounded-[var(--radius-lg)] bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Accepted"
          tone="teal"
          value={loading ? '—' : String(accepted)}
        />
        <StatCard
          label="In production"
          tone="sky"
          accent
          value={loading ? '—' : String(inProd)}
        />
        <StatCard
          label="Author proof"
          tone="amber"
          value={loading ? '—' : String(awaitingProof)}
        />
        <StatCard
          label="Ready to publish"
          tone="green"
          value={loading ? '—' : String(ready)}
        />
      </section>

      <DataPanel
        title="Pipeline"
        count={loading ? undefined : manuscripts.length}
        size="lg"
        scroll={!loading && manuscripts.length > 0}
      >
        {loading ? (
          <EmptyState title="Loading">Loading production queue…</EmptyState>
        ) : manuscripts.length === 0 ? (
          <EmptyState title="No manuscripts">
            When an editor accepts a manuscript, it will appear in this pipeline.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {manuscripts.map((item) => (
              <li key={item.id}>
                <Link
                  to={`/production/manuscript/${item.id}`}
                  className="icon-row"
                >
                  <span className="icon-row-glyph" aria-hidden>
                    <DocIcon />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-signal-600">
                      {item.id}
                      <span className="text-ink-300"> · </span>
                      <span className="text-ink-500">{item.journal}</span>
                      {item.doi ? (
                        <>
                          <span className="text-ink-300"> · </span>
                          <span className="text-ink-500">{item.doi}</span>
                        </>
                      ) : null}
                    </p>
                    <p className="mt-0.5 truncate font-semibold text-ink-800">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-sm text-ink-500">
                      {item.authors}
                      {item.proofRound ? ` · Proof round ${item.proofRound}` : ''}
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

function DocIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 3h7l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  )
}
