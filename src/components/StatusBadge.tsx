import { statusLabels, type ManuscriptStatus } from '../data/mock'

const styles: Record<ManuscriptStatus, string> = {
  draft: 'bg-ink-50 text-ink-600 ring-ink-100',
  submitted: 'bg-sky-50 text-sky-700 ring-sky-50',
  under_review: 'bg-violet-50 text-violet-700 ring-violet-50',
  revision_requested: 'bg-amber-50 text-amber-600 ring-amber-50',
  accepted: 'bg-signal-50 text-signal-700 ring-signal-100',
  in_production: 'bg-signal-50 text-signal-700 ring-signal-100',
  proof_sent: 'bg-amber-50 text-amber-600 ring-amber-50',
  published: 'bg-signal-100 text-signal-700 ring-signal-100',
  rejected: 'bg-rose-50 text-rose-600 ring-rose-50',
}

const dots: Record<ManuscriptStatus, string> = {
  draft: 'bg-ink-300',
  submitted: 'bg-sky-700',
  under_review: 'bg-violet-700 animate-pulse-soft',
  revision_requested: 'bg-amber-600',
  accepted: 'bg-signal-500',
  in_production: 'bg-signal-500',
  proof_sent: 'bg-amber-600 animate-pulse-soft',
  published: 'bg-signal-600',
  rejected: 'bg-rose-600',
}

type StatusBadgeProps = {
  status: ManuscriptStatus
  compact?: boolean
}

export function StatusBadge({ status, compact = false }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${styles[status]}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dots[status]}`} />
      <span className={compact ? 'truncate' : ''}>{statusLabels[status]}</span>
    </span>
  )
}
