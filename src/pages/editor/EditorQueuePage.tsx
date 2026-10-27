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

type StageId =
  | 'all'
  | 'submission'
  | 'review'
  | 'copyediting'
  | 'production'
  | 'published'
  | 'declined'

const STAGES: Array<{ id: StageId; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'submission', label: 'Submission' },
  { id: 'review', label: 'Review' },
  { id: 'copyediting', label: 'Copyediting' },
  { id: 'production', label: 'Production' },
  { id: 'published', label: 'Published' },
  { id: 'declined', label: 'Declined' },
]

function stageOf(status: string): StageId {
  if (status === 'submitted' || status === 'formatting_requested')
    return 'submission'
  if (
    status === 'under_review' ||
    status === 'revision_requested' ||
    status === 'revision_submitted'
  )
    return 'review'
  if (status === 'copyediting' || status === 'accepted') return 'copyediting'
  if (
    status === 'in_production' ||
    status === 'proof_sent' ||
    status === 'ready_for_publication'
  )
    return 'production'
  if (status === 'published') return 'published'
  if (status === 'rejected') return 'declined'
  return 'all'
}

export function EditorQueuePage() {
  const [manuscripts, setManuscripts] = useState<ApiManuscript[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stage, setStage] = useState<StageId>('all')

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
      stage: stageOf(item.status),
    }))
  }, [manuscripts])

  const counts = useMemo(() => {
    const map: Record<StageId, number> = {
      all: enriched.length,
      submission: 0,
      review: 0,
      copyediting: 0,
      production: 0,
      published: 0,
      declined: 0,
    }
    for (const item of enriched) {
      if (item.stage !== 'all') map[item.stage] += 1
    }
    return map
  }, [enriched])

  const needsDecision = enriched.filter((item) => item.awaitingDecision)
  const filtered =
    stage === 'all' ? enriched : enriched.filter((item) => item.stage === stage)

  return (
    <div className="page-stack animate-rise">
      <PageHeader
        title="Submissions"
        description="OJS-style editorial queue by workflow stage. Screen, assign editors, invite reviewers, and decide."
      />

      {error ? (
        <p className="rounded-[var(--radius-lg)] bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      ) : null}

      <nav
        className="overflow-x-auto border-b border-line"
        aria-label="Workflow stages"
      >
        <ul className="flex gap-1 pb-px">
          {STAGES.map((item) => {
            const active = stage === item.id
            return (
              <li key={item.id} className="shrink-0">
                <button
                  type="button"
                  className={`border-b-2 px-3 py-2.5 text-sm font-semibold transition ${
                    active
                      ? 'border-signal-600 text-signal-800'
                      : 'border-transparent text-ink-500 hover:text-ink-800'
                  }`}
                  onClick={() => setStage(item.id)}
                >
                  {item.label}
                  <span className="ml-1.5 text-xs font-medium text-ink-400">
                    {counts[item.id]}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {needsDecision.length > 0 && (stage === 'all' || stage === 'review') ? (
        <Notice tone="info" title="Decision needed">
          {needsDecision.length} manuscript
          {needsDecision.length === 1 ? '' : 's'} have reviews ready for an
          editorial decision.
        </Notice>
      ) : null}

      {needsDecision.length > 0 && (stage === 'all' || stage === 'review') ? (
        <DataPanel
          title="Awaiting decision"
          description="Reviews complete — record Accept, Revision, or Reject."
          count={needsDecision.length}
          accent
          size="md"
          scroll
        >
          <QueueList items={needsDecision} highlight actionLabel="Decide" />
        </DataPanel>
      ) : null}

      <DataPanel
        title={
          STAGES.find((s) => s.id === stage)?.label ?? 'Submissions'
        }
        description={
          stage === 'submission'
            ? 'New submissions awaiting screening.'
            : stage === 'review'
              ? 'Peer review and author revisions.'
              : stage === 'copyediting'
                ? 'Accepted papers in copyediting.'
                : stage === 'production'
                  ? 'Layout, proofs, and issue scheduling.'
                  : 'All manuscripts in your editorial scope.'
        }
        count={loading ? undefined : filtered.length}
        size="lg"
        scroll={!loading && filtered.length > 0}
      >
        {loading ? (
          <EmptyState title="Loading">Loading queue…</EmptyState>
        ) : filtered.length === 0 ? (
          <EmptyState title="No manuscripts">
            There are no manuscripts in this stage.
          </EmptyState>
        ) : (
          <QueueList
            items={filtered}
            actionLabel={
              stage === 'submission'
                ? 'Screen'
                : stage === 'review'
                  ? 'Open'
                  : 'Open'
            }
          />
        )}
      </DataPanel>
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
    assignedEditor?: string
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
                {item.assignedEditor
                  ? `Editor: ${item.assignedEditor} · `
                  : 'Unassigned · '}
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
