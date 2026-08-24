import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { StatusBadge } from '../components/StatusBadge'
import {
  DataPanel,
  EmptyState,
  PageHeader,
  ScrollArea,
  SectionTitle,
  StatCard,
} from '../components/ui'
import {
  fetchMyActivity,
  fetchMyManuscripts,
  type ApiActivity,
  type ApiManuscript,
} from '../lib/manuscripts'

export function AuthorDashboard() {
  const [manuscripts, setManuscripts] = useState<ApiManuscript[]>([])
  const [activity, setActivity] = useState<ApiActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [ms, act] = await Promise.all([
          fetchMyManuscripts(),
          fetchMyActivity(),
        ])
        if (!cancelled) {
          setManuscripts(ms)
          setActivity(act)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load manuscripts.')
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

  const actionNeeded = manuscripts.filter((m) =>
    ['revision_requested', 'proof_sent', 'draft', 'formatting_requested'].includes(
      m.status,
    ),
  )

  return (
    <div className="page-stack animate-rise">
      <PageHeader
        title="Your manuscripts"
        description="Track submissions from draft to publication. Items that need you stay at the top."
        actions={
          <Link to="/author/submissions/new" className="btn btn-signal">
            <PlusIcon />
            New submission
          </Link>
        }
      />

      {error ? (
        <p className="rounded-[var(--radius-lg)] bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Active"
          tone="sky"
          icon={<DocIcon />}
          value={
            loading
              ? '—'
              : String(
                  manuscripts.filter(
                    (m) => !['published', 'rejected', 'draft'].includes(m.status),
                  ).length,
                )
          }
        />
        <StatCard
          label="Needs action"
          tone="amber"
          accent
          icon={<AlertIcon />}
          value={loading ? '—' : String(actionNeeded.length)}
        />
        <StatCard
          label="Published"
          tone="green"
          icon={<CheckIcon />}
          value={
            loading
              ? '—'
              : String(manuscripts.filter((m) => m.status === 'published').length)
          }
        />
      </section>

      {actionNeeded.length > 0 ? (
        <DataPanel
          title="Needs attention"
          count={actionNeeded.length}
          accent
          size="sm"
        >
          <ul className="divide-y divide-line">
            {actionNeeded.map((item) => (
              <li key={item.id}>
                <ManuscriptLink item={item} />
              </li>
            ))}
          </ul>
        </DataPanel>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[1.45fr_0.9fr]">
        <DataPanel
          title="Submissions"
          count={loading ? undefined : manuscripts.length}
          size="lg"
          scroll={!loading && manuscripts.length > 0}
        >
          {loading ? (
            <EmptyState title="Loading">Loading manuscripts…</EmptyState>
          ) : manuscripts.length === 0 ? (
            <EmptyState title="No submissions yet">
              <Link
                to="/author/submissions/new"
                className="font-semibold text-signal-600 hover:text-signal-700"
              >
                Start your first one
              </Link>
            </EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {manuscripts.map((item) => (
                <li key={item.id}>
                  <ManuscriptLink item={item} showAuthors />
                </li>
              ))}
            </ul>
          )}
        </DataPanel>

        <aside>
          <SectionTitle title="Recent activity" />
          <div className="surface overflow-hidden">
            {loading ? (
              <p className="px-4 py-6 text-sm text-ink-500">Loading…</p>
            ) : activity.length === 0 ? (
              <p className="px-4 py-6 text-sm text-ink-500">No activity yet.</p>
            ) : (
              <ScrollArea size="md">
                <ol className="space-y-4 p-4">
                  {activity.map((item, index) => (
                    <ActivityItem
                      key={item.id}
                      item={item}
                      last={index === activity.length - 1}
                    />
                  ))}
                </ol>
              </ScrollArea>
            )}
          </div>
        </aside>
      </section>
    </div>
  )
}

function ManuscriptLink({
  item,
  showAuthors = false,
}: {
  item: ApiManuscript
  showAuthors?: boolean
}) {
  return (
    <Link to={`/author/submissions/${item.id}`} className="icon-row">
      <span className="icon-row-glyph" aria-hidden>
        <DocIcon />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-signal-600">
          {item.id}
          <span className="text-ink-300"> · </span>
          <span className="text-ink-500">{item.journal}</span>
        </p>
        <p className="mt-0.5 truncate font-semibold text-ink-800">{item.title}</p>
        {showAuthors ? (
          <p className="mt-0.5 truncate text-sm text-ink-500">{item.authors}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <StatusBadge status={item.status} compact />
        <p className="text-xs text-ink-300">Updated {item.updatedAt}</p>
      </div>
    </Link>
  )
}

function ActivityItem({
  item,
  last,
}: {
  item: ApiActivity
  last: boolean
}) {
  return (
    <li className="relative flex gap-3 pl-1">
      {!last ? (
        <span className="absolute top-3 left-[0.55rem] h-[calc(100%+0.5rem)] w-px bg-line" />
      ) : null}
      <span className="relative mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-signal-500 ring-4 ring-signal-50" />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink-800">{item.label}</p>
        <p className="mt-0.5 text-sm text-ink-500">{item.detail}</p>
        <p className="mt-1 text-xs font-medium text-ink-300">
          {item.manuscriptId} · {item.at}
        </p>
      </div>
    </li>
  )
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 3v10M3 8h10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
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

function AlertIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 9v4M12 17h.01"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M10.3 4.8 2.9 17.2A2 2 0 0 0 4.6 20h14.8a2 2 0 0 0 1.7-2.8L13.7 4.8a2 2 0 0 0-3.4 0Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="m8.5 12.2 2.4 2.4 4.6-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
