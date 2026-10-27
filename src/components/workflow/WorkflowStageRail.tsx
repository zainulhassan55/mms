import {
  activeWorkflowStageIndex,
  workflowStages,
} from '../../lib/workflow'
import { ManuscriptStageTracker } from './ManuscriptStageTracker'

export function WorkflowStageRail({
  status,
  compact = false,
}: {
  status: string
  compact?: boolean
}) {
  if (status === 'rejected') {
    return (
      <div className="rounded-[var(--radius-lg)] border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        <p className="font-semibold">Declined</p>
        <p className="mt-1 text-ink-600">
          This submission left the editorial workflow after a decline decision.
        </p>
      </div>
    )
  }

  const active = activeWorkflowStageIndex(status)

  return (
    <div className={`surface ${compact ? 'p-4' : 'p-5 sm:p-6'}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-wide text-ink-500 uppercase">
          Workflow progress
        </h2>
        <span className="text-xs font-medium text-ink-400">
          {workflowStages[Math.max(active, 0)]?.label} · stage{' '}
          {Math.max(active + 1, 1)} of {workflowStages.length}
        </span>
      </div>
      <div className="mt-5">
        <ManuscriptStageTracker status={status} size={compact ? 'sm' : 'md'} />
      </div>
      <p className="mt-4 text-sm text-ink-500">
        The raised teal circle is the <span className="font-semibold text-ink-700">current</span>{' '}
        stage. Completed stages show a checkmark.
      </p>
    </div>
  )
}
