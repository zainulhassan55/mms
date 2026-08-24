import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { StatusBadge } from '../../components/StatusBadge'
import {
  DataPanel,
  EmptyState,
  Notice,
  PageHeader,
} from '../../components/ui'
import {
  fetchMyManuscripts,
  type ApiManuscript,
} from '../../lib/manuscripts'

const screeningStatuses = ['submitted', 'formatting_requested'] as const
const activeStatuses = ['under_review', 'revision_requested'] as const
const handedOffStatuses = [
  'accepted',
  'in_production',
  'proof_sent',
  'ready_for_publication',
  'published',
  'rejected',
] as const

export function EditorQueuePage() {
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

  const enriched = useMemo(() => {
    return manuscripts.map((item) => ({
      ...item,
      reviewCount: item.reviewCount ?? 0,
      openInviteCount: item.openInviteCount ?? 0,
      awaitingDecision: Boolean(item.awaitingDecision),
    }))
  }, [manuscripts])

  const screening = enriched.filter((item) =>
    (screeningStatuses as readonly string[]).includes(item.status),
  )
  const needsDecision = enriched.filter((item) => item.awaitingDecision)
  const active = enriched.filter(
    (item) =>
      (activeStatuses as readonly string[]).includes(item.status) &&
      !item.awaitingDecision,
  )
  const handedOff = enriched.filter((item) =>
    (handedOffStatuses as readonly string[]).includes(item.status),
  )

  return (
    <div className="page-stack animate-rise">
      <PageHeader
        title="Editorial queue"
        description="Screen new submissions, invite reviewers, then record Accept / Revision / Reject."
      />

      {error ? (
        <p className="rounded-[var(--radius-lg)] bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      ) : null}

      {screening.length > 0 ? (
        <Notice tone="info" title="Screening needed">
          {screening.length} manuscript
          {screening.length === 1 ? '' : 's'} awaiting initial screening.
        </Notice>
      ) : null}

      <DataPanel
        title="Awaiting screening"
        description="New submissions that need initial screening."
        count={loading ? undefined : screening.length}
        size="md"
        accent={screening.length > 0}
        scroll={!loading && screening.length > 0}
      >
        {loading ? (
          <EmptyState title="Loading">Loading queue…</EmptyState>
        ) : screening.length === 0 ? (
          <EmptyState title="No manuscripts">
            There are no manuscripts in this queue.
          </EmptyState>
        ) : (
          <QueueList items={screening} actionLabel="Screen" />
        )}
      </DataPanel>

      <DataPanel
        title="Decision"
        description="Manuscripts ready for editorial decision."
        count={loading ? undefined : needsDecision.length}
        accent={needsDecision.length > 0}
        size="md"
        scroll={!loading && needsDecision.length > 0}
      >
        {loading ? (
          <EmptyState title="Loading">Loading…</EmptyState>
        ) : needsDecision.length === 0 ? (
          <EmptyState title="No manuscripts">
            There are no manuscripts in this queue.
          </EmptyState>
        ) : (
          <QueueList
            items={needsDecision}
            highlight
            actionLabel="Record decision"
          />
        )}
      </DataPanel>

      <DataPanel
        title="Peer review"
        description="Manuscripts with pending or completed peer reviews."
        count={loading ? undefined : active.length}
        size="lg"
        scroll={!loading && active.length > 0}
      >
        {loading ? (
          <EmptyState title="Loading">Loading…</EmptyState>
        ) : active.length === 0 ? (
          <EmptyState title="No manuscripts">
            There are no manuscripts in this queue.
          </EmptyState>
        ) : (
          <QueueList items={active} />
        )}
      </DataPanel>

      {handedOff.length > 0 ? (
        <DataPanel
          title="Handed off"
          description="Accepted, in production, published, or rejected."
          count={handedOff.length}
          size="md"
        >
          <QueueList items={handedOff} />
        </DataPanel>
      ) : null}
    </div>
  )
}

function QueueList({
  items,
  highlight = false,
  actionLabel = 'Open',
}: {
  items: Array<{
    id: string
    title: string
    journal: string
    status: string
    reviewCount: number
    openInviteCount: number
    awaitingDecision: boolean
    submittedAt?: string | null
  }>
  highlight?: boolean
  actionLabel?: string
}) {
  return (
    <ul className="divide-y divide-line">
      {items.map((item) => (
        <li key={item.id} className={highlight ? 'bg-signal-50/30' : undefined}>
          <Link to={`/editor/manuscript/${item.id}`} className="icon-row">
            <span className="icon-row-glyph" aria-hidden>
              <DocIcon />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-signal-600">
                {item.id}
                <span className="text-ink-300"> · </span>
                <span className="text-ink-500">{item.journal}</span>
              </p>
              <p className="mt-0.5 truncate font-semibold text-ink-800">
                {item.title}
              </p>
              <p className="mt-0.5 text-sm text-ink-500">
                {item.submittedAt ? `Submitted ${item.submittedAt} · ` : ''}
                {item.reviewCount > 0
                  ? `${item.reviewCount} review${item.reviewCount === 1 ? '' : 's'}`
                  : 'No reviews yet'}
                {item.openInviteCount > 0
                  ? ` · ${item.openInviteCount} open invite${item.openInviteCount === 1 ? '' : 's'}`
                  : ''}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <StatusBadge status={item.status as never} compact />
              <span className="text-sm font-semibold text-signal-600">
                {actionLabel} →
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
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
