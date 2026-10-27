import {
  activeWorkflowStageIndex,
  workflowStages,
} from '../../lib/workflow'

/**
 * Compact OJS-style progress: circles connected by a line.
 * The current stage “floats” (larger ring + lift) so authors see where the paper is.
 */
export function ManuscriptStageTracker({
  status,
  size = 'md',
}: {
  status: string
  size?: 'sm' | 'md'
}) {
  if (status === 'rejected') {
    return (
      <p className="text-xs font-semibold text-rose-600">
        Declined — left the workflow
      </p>
    )
  }

  const active = Math.max(activeWorkflowStageIndex(status), 0)
  const sm = size === 'sm'

  return (
    <ol
      className="flex w-full items-start justify-between gap-0"
      aria-label={`Workflow progress: ${workflowStages[active]?.label ?? 'Submission'}`}
    >
      {workflowStages.map((stage, index) => {
        const done = index < active
        const current = index === active
        const upcoming = index > active

        return (
          <li
            key={stage.id}
            className="relative flex min-w-0 flex-1 flex-col items-center text-center"
          >
            {index < workflowStages.length - 1 ? (
              <span
                aria-hidden
                className={`absolute top-[0.7rem] left-[calc(50%+0.55rem)] right-[calc(-50%+0.55rem)] h-0.5 ${
                  index < active ? 'bg-signal-500' : 'bg-line'
                }`}
              />
            ) : null}

            <span
              className={[
                'relative z-[1] flex items-center justify-center rounded-full border-2 transition',
                sm ? 'h-5 w-5 text-[0.55rem]' : 'h-6 w-6 text-[0.65rem]',
                current
                  ? 'scale-110 border-signal-600 bg-signal-600 text-white shadow-[0_6px_16px_-4px_rgba(13,148,136,0.55)] ring-4 ring-signal-100'
                  : done
                    ? 'border-signal-500 bg-signal-500 text-white'
                    : 'border-line bg-paper text-ink-300',
                current && !sm ? 'animate-pulse-soft' : '',
              ].join(' ')}
              aria-current={current ? 'step' : undefined}
            >
              {done && !current ? (
                <CheckMini />
              ) : (
                <span className="font-bold">{index + 1}</span>
              )}
            </span>

            <span
              className={[
                'mt-2 max-w-[4.5rem] truncate text-[0.65rem] leading-tight font-semibold tracking-wide uppercase sm:max-w-none',
                current
                  ? 'text-signal-800'
                  : done
                    ? 'text-ink-600'
                    : upcoming
                      ? 'text-ink-300'
                      : 'text-ink-400',
              ].join(' ')}
            >
              {stage.label}
            </span>
            {current ? (
              <span className="mt-0.5 text-[0.6rem] font-medium text-signal-600">
                Current
              </span>
            ) : (
              <span className="mt-0.5 text-[0.6rem] text-transparent select-none">
                .
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}

function CheckMini() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="M2.5 6.2 4.8 8.5 9.5 3.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
