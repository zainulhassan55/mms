import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { StatusBadge } from '../components/StatusBadge'
import { ManuscriptStageTracker } from '../components/workflow/ManuscriptStageTracker'
import {
  EmptyState,
  PageHeader,
  StatCard,
} from '../components/ui'
import { statusLabels } from '../data/mock'
import {
  activeWorkflowStageIndex,
  workflowStages,
} from '../lib/workflow'
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
          setError(
            err instanceof Error ? err.message : 'Failed to load manuscripts.',
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

  const actionNeeded = useMemo(
    () =>
      manuscripts.filter((m) =>
        [
          'revision_requested',
          'proof_sent',
          'draft',
          'formatting_requested',
        ].includes(m.status),
      ),
    [manuscripts],
  )

  const activeCount = manuscripts.filter(
    (m) => !['published', 'rejected', 'draft'].includes(m.status),
  ).length
  const publishedCount = manuscripts.filter(
    (m) => m.status === 'published',
  ).length

  const sorted = useMemo(() => {
    const rank = (m: ApiManuscript) => {
      if (
        [
          'revision_requested',
          'revision_submitted',
          'proof_sent',
          'formatting_requested',
          'draft',
        ].includes(
          m.status,
        )
      )
        return 0
      if (m.status === 'published' || m.status === 'rejected') return 2
      return 1
    }
    return [...manuscripts].sort((a, b) => rank(a) - rank(b))
  }, [manuscripts])

  const activityByManuscript = useMemo(() => {
    const map = new Map<string, ApiActivity[]>()
    for (const item of activity) {
      const key = item.manuscriptId || 'unknown'
      const list = map.get(key) ?? []
      list.push(item)
      map.set(key, list)
    }
    return map
  }, [activity])

  return (
    <div className="page-stack mx-auto max-w-5xl animate-rise">
      <PageHeader
        title="Your manuscripts"
        description="Each paper moves through Submission → Review → Copyediting → Production → Published. The highlighted circle is the current stage."
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
          label="In progress"
          tone="sky"
          icon={<DocIcon />}
          value={loading ? '—' : String(activeCount)}
        />
        <StatCard
          label="Needs your action"
          tone="amber"
          accent={actionNeeded.length > 0}
          icon={<AlertIcon />}
          value={loading ? '—' : String(actionNeeded.length)}
        />
        <StatCard
          label="Published"
          tone="green"
          icon={<CheckIcon />}
          value={loading ? '—' : String(publishedCount)}
        />
      </section>

      {actionNeeded.length > 0 ? (
        <section className="rounded-[var(--radius-lg)] border border-amber-200 bg-amber-50/80 px-4 py-3 sm:px-5">
          <p className="text-sm font-semibold text-amber-900">
            {actionNeeded.length} manuscript
            {actionNeeded.length === 1 ? '' : 's'} need{actionNeeded.length === 1 ? 's' : ''}{' '}
            your attention
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {actionNeeded.map((item) => (
              <li key={item.id}>
                <Link
                  to={`/author/submissions/${item.id}`}
                  className="inline-flex items-center gap-2 rounded-md bg-paper px-3 py-1.5 text-sm font-semibold text-ink-800 ring-1 ring-amber-100 hover:text-signal-800"
                >
                  {item.id}
                  <span className="font-medium text-amber-700">
                    {statusLabels[item.status as keyof typeof statusLabels] ??
                      item.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold text-ink-800">
              Submissions
            </h2>
            <p className="mt-1 text-sm text-ink-500">
              Progress is shown on every paper. Open a manuscript for full history.
            </p>
          </div>
          {!loading ? (
            <p className="text-sm font-medium text-ink-400">
              {manuscripts.length} total
            </p>
          ) : null}
        </div>

        {loading ? (
          <div className="surface px-5 py-10 text-center text-sm text-ink-500">
            Loading manuscripts…
          </div>
        ) : manuscripts.length === 0 ? (
          <EmptyState title="No submissions yet">
            <p className="mb-3 text-sm text-ink-500">
              When you submit a paper, it appears here with a live stage tracker.
            </p>
            <Link
              to="/author/submissions/new"
              className="font-semibold text-signal-600 hover:text-signal-700"
            >
              Start your first submission →
            </Link>
          </EmptyState>
        ) : (
          <ul className="space-y-4">
            {sorted.map((item) => (
              <li key={item.id}>
                <ManuscriptCard
                  item={item}
                  recent={activityByManuscript.get(item.id)?.slice(0, 3) ?? []}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function ManuscriptCard({
  item,
  recent,
}: {
  item: ApiManuscript
  recent: ApiActivity[]
}) {
  const stageIdx = activeWorkflowStageIndex(item.status)
  const stageLabel =
    item.status === 'rejected'
      ? 'Declined'
      : workflowStages[Math.max(stageIdx, 0)]?.label ?? 'Submission'
  const needsYou = [
    'revision_requested',
    'proof_sent',
    'draft',
    'formatting_requested',
  ].includes(item.status)

  return (
    <article
      className={`overflow-hidden rounded-[var(--radius-lg)] border bg-paper transition ${
        needsYou
          ? 'border-amber-200 shadow-[0_10px_30px_-18px_rgba(180,83,9,0.45)]'
          : 'border-line'
      }`}
    >
      <Link
        to={`/author/submissions/${item.id}`}
        className="block px-4 pt-4 pb-3 sm:px-5 sm:pt-5"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wide text-signal-700 uppercase">
              {item.id}
              <span className="text-ink-300"> · </span>
              <span className="font-medium normal-case text-ink-500">
                {item.journal}
              </span>
            </p>
            <h3 className="mt-1 font-display text-lg leading-snug font-semibold text-ink-800">
              {item.title}
            </h3>
            <p className="mt-1 truncate text-sm text-ink-500">{item.authors}</p>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-1.5 sm:items-end">
            <StatusBadge status={item.status} compact />
            <p className="text-xs text-ink-400">
              Stage: <span className="font-semibold text-ink-700">{stageLabel}</span>
            </p>
            <p className="text-xs text-ink-300">Updated {item.updatedAt}</p>
          </div>
        </div>

        <div className="mt-5 border-t border-line/80 pt-4">
          <ManuscriptStageTracker status={item.status} />
        </div>
      </Link>

      {recent.length > 0 ? (
        <div className="border-t border-line bg-paper-soft/70 px-4 py-3 sm:px-5">
          <p className="text-[0.65rem] font-semibold tracking-wide text-ink-400 uppercase">
            Latest for this paper
          </p>
          <ul className="mt-2 space-y-1.5">
            {recent.map((event) => (
              <li
                key={event.id}
                className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-sm"
              >
                <span className="font-medium text-ink-700">{event.label}</span>
                <span className="text-xs text-ink-400">{event.at}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {needsYou ? (
        <div className="border-t border-amber-100 bg-amber-50/50 px-4 py-2.5 sm:px-5">
          <Link
            to={`/author/submissions/${item.id}`}
            className="text-sm font-semibold text-amber-800 hover:text-amber-950"
          >
            Action required — open manuscript →
          </Link>
        </div>
      ) : null}
    </article>
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
      <path
        d="M14 3v4h4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
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
