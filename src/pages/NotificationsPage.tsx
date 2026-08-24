import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { DataPanel, EmptyState, PageHeader } from '../components/ui'
import {
  fetchMyActivity,
  type ApiActivity,
} from '../lib/manuscripts'

function notificationPath(manuscriptId: string, role: string | undefined) {
  if (!manuscriptId) return '#'
  if (role === 'editor') return `/editor/manuscript/${manuscriptId}`
  if (role === 'office') return `/editor/manuscript/${manuscriptId}`
  if (role === 'production') return `/production/manuscript/${manuscriptId}`
  if (role === 'reviewer') return `/reviewer/invitations`
  return `/author/submissions/${manuscriptId}`
}

export function NotificationsPage() {
  const { user } = useAuth()
  const [activity, setActivity] = useState<ApiActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const items = await fetchMyActivity()
        if (!cancelled) setActivity(items)
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load notifications.',
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

  return (
    <div className="page-stack animate-rise">
      <PageHeader
        title="Notifications"
        description="Status changes, invitations, and deadlines from the live workflow."
      />

      {error ? (
        <p className="rounded-[var(--radius-lg)] bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      ) : null}

      <DataPanel
        title="Activity"
        count={loading ? undefined : activity.length}
        size="lg"
        scroll={!loading && activity.length > 0}
      >
        {loading ? (
          <EmptyState title="Loading">Loading notifications…</EmptyState>
        ) : activity.length === 0 ? (
          <EmptyState title="No notifications">No notifications yet.</EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {activity.map((item) => (
              <li key={item.id}>
                <Link
                  to={notificationPath(item.manuscriptId, user?.role)}
                  className="icon-row"
                >
                  <span className="icon-row-glyph" aria-hidden>
                    <BellGlyph />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink-800">
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-sm text-ink-500">{item.detail}</p>
                    <p className="mt-1 text-xs font-medium text-ink-300">
                      {item.manuscriptId || 'System'}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-ink-300">
                    {item.at}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </DataPanel>
    </div>
  )
}

function BellGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 9a6 6 0 1 1 12 0c0 3.2.8 4.6 1.5 5.5.3.4 0 1-.5 1H5c-.5 0-.8-.6-.5-1C5.2 13.6 6 12.2 6 9Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M10 18a2 2 0 0 0 4 0"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}
