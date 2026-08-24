import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  DataPanel,
  EmptyState,
  PageHeader,
  StatCard,
} from '../../components/ui'
import {
  fetchAdminAnalytics,
  type AdminAnalytics,
} from '../../lib/manuscripts'

export function AdminAnalyticsPage() {
  const [stats, setStats] = useState<AdminAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const analytics = await fetchAdminAnalytics()
        if (!cancelled) setStats(analytics)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load analytics.')
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
    <div className="page-stack animate-rise">
      <PageHeader
        title="Analytics"
        description="Live publisher overview from the database."
      />

      {error ? (
        <p className="rounded-[var(--radius-lg)] bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Manuscripts" value={loading ? '—' : String(stats?.total ?? 0)} />
        <StatCard label="Submitted" value={loading ? '—' : String(stats?.submitted ?? 0)} />
        <StatCard
          label="Under review"
          value={loading ? '—' : String(stats?.underReview ?? 0)}
          accent
        />
        <StatCard
          label="Acceptance rate"
          value={loading ? '—' : `${stats?.acceptanceRate ?? 0}%`}
        />
        <StatCard label="Published" value={loading ? '—' : String(stats?.published ?? 0)} />
        <StatCard label="Rejected" value={loading ? '—' : String(stats?.rejected ?? 0)} />
        <StatCard
          label="Pending invites"
          value={loading ? '—' : String(stats?.pendingInvites ?? 0)}
        />
        <StatCard
          label="Portal syncs"
          value={loading ? '—' : String(stats?.portalSyncs ?? 0)}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <DataPanel
          title="By journal"
          count={loading ? undefined : stats?.byJournal.length}
          size="md"
          scroll={!loading && Boolean(stats?.byJournal.length)}
        >
          {loading ? (
            <EmptyState>Loading…</EmptyState>
          ) : !stats?.byJournal.length ? (
            <EmptyState>No journals configured.</EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {stats.byJournal.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <span className="font-semibold text-ink-800">{row.name}</span>
                  <span className="text-ink-500">
                    {row.count} · {row.published} published
                  </span>
                </li>
              ))}
            </ul>
          )}
        </DataPanel>

        <DataPanel
          title="Recent activity"
          count={loading ? undefined : stats?.recentActivity.length}
          size="md"
          scroll={!loading && Boolean(stats?.recentActivity.length)}
          action={
            <Link
              to="/admin/portal-sync"
              className="text-sm font-semibold text-signal-600 hover:text-signal-700"
            >
              Portal log
            </Link>
          }
        >
          {loading ? (
            <EmptyState>Loading…</EmptyState>
          ) : !stats?.recentActivity.length ? (
            <EmptyState>No activity yet.</EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {stats.recentActivity.map((item) => (
                <li key={item.id} className="px-4 py-3">
                  <p className="text-sm font-semibold text-ink-800">{item.label}</p>
                  <p className="mt-1 text-sm text-ink-500">{item.detail}</p>
                  <p className="mt-1 text-xs text-ink-300">
                    {item.manuscriptId} · {item.at}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </DataPanel>
      </section>
    </div>
  )
}
