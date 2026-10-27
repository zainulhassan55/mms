import { useEffect, useState } from 'react'
import { useToast } from '../ToastProvider'
import {
  closeReviewRound,
  fetchReviewRounds,
  openReviewRound,
  type ReviewRound,
} from '../../lib/workflow'

export function ReviewRoundsPanel({
  manuscriptId,
  canManage,
}: {
  manuscriptId: string
  canManage?: boolean
}) {
  const toast = useToast()
  const [rounds, setRounds] = useState<ReviewRound[]>([])
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)

  async function reload() {
    const list = await fetchReviewRounds(manuscriptId)
    setRounds(list)
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        await reload()
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : 'Failed to load rounds')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manuscriptId, toast])

  async function handleOpen() {
    setPending(true)
    try {
      await openReviewRound(manuscriptId)
      toast.success('Review round opened.')
      await reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open round')
    } finally {
      setPending(false)
    }
  }

  async function handleClose(roundId: string) {
    setPending(true)
    try {
      await closeReviewRound(manuscriptId, roundId)
      toast.success('Review round closed.')
      await reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not close round')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="surface space-y-4 p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-ink-500 uppercase">
            Review rounds
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            Each round keeps invitations, reports, and decisions together.
          </p>
        </div>
        {canManage ? (
          <button
            type="button"
            className="btn btn-ghost shrink-0"
            disabled={pending}
            onClick={() => void handleOpen()}
          >
            {pending ? 'Working…' : 'Open new round'}
          </button>
        ) : null}
      </div>


      {loading ? (
        <p className="text-sm text-ink-400">Loading rounds…</p>
      ) : rounds.length === 0 ? (
        <p className="rounded-md bg-paper-soft px-3 py-3 text-sm text-ink-500">
          No review rounds yet. Passing screening or inviting a reviewer creates round 1.
        </p>
      ) : (
        <ul className="space-y-3">
          {rounds.map((round) => (
            <li
              key={round.id}
              className="rounded-[var(--radius-md)] border border-line bg-paper-soft p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-ink-800">
                    Round {round.roundNumber}
                  </p>
                  <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-ink-400">
                    {round.status}
                    {round.openedAt
                      ? ` · opened ${String(round.openedAt).slice(0, 10)}`
                      : ''}
                  </p>
                </div>
                {canManage && round.status === 'open' ? (
                  <button
                    type="button"
                    className="btn btn-ghost text-xs"
                    disabled={pending}
                    onClick={() => void handleClose(round.id)}
                  >
                    Close round
                  </button>
                ) : null}
              </div>

              <ul className="mt-3 space-y-2">
                {round.invitations.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex flex-wrap items-baseline justify-between gap-2 text-sm"
                  >
                    <span className="text-ink-700">
                      {inv.reviewer.name}
                      <span className="text-ink-400"> · {inv.status}</span>
                    </span>
                    <span className="text-xs text-ink-400">
                      {inv.review
                        ? inv.review.recommendation.replace('_', ' ')
                        : `due ${String(inv.deadline).slice(0, 10)}`}
                    </span>
                  </li>
                ))}
                {round.invitations.length === 0 ? (
                  <li className="text-sm text-ink-400">No invitations in this round.</li>
                ) : null}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
