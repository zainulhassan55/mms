import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { invitationLabels } from '../../data/mock'
import { DataPanel, EmptyState, PageHeader } from '../../components/ui'
import {
  fetchMyInvitations,
  respondToInvitation,
  type ApiInvitation,
} from '../../lib/manuscripts'

export function ReviewerInvitationsPage() {
  const [invitations, setInvitations] = useState<ApiInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [declineId, setDeclineId] = useState<string | null>(null)
  const [declineReason, setDeclineReason] = useState('')

  async function reload() {
    const items = await fetchMyInvitations('sent')
    setInvitations(items)
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const items = await fetchMyInvitations('sent')
        if (!cancelled) setInvitations(items)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load invitations.')
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

  async function handleRespond(
    id: string,
    response: 'accepted' | 'declined',
    reason?: string,
  ) {
    setPendingId(id)
    setError(null)
    try {
      await respondToInvitation(id, {
        response,
        declineReason: reason,
      })
      setDeclineId(null)
      setDeclineReason('')
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update invitation.')
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="page-stack animate-rise">
      <PageHeader
        title="Pending invitations"
        description="Accept or decline review requests. Declines can include a short note for the editor."
      />

      {error ? (
        <p className="rounded-[var(--radius-lg)] bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      ) : null}

      <DataPanel
        title="Invitations"
        count={loading ? undefined : invitations.length}
        size="lg"
        scroll={!loading && invitations.length > 0}
      >
        {loading ? (
          <EmptyState title="Loading">Loading invitations…</EmptyState>
        ) : invitations.length === 0 ? (
          <EmptyState title="No pending invitations">
            An editor must invite you from their manuscript page.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {invitations.map((item) => (
              <li key={item.id} className="px-4 py-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <span className="icon-row-glyph mt-0.5" aria-hidden>
                      <MailIcon />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-signal-600">
                        {item.manuscriptId} · Due {item.deadline}
                      </p>
                      <p className="mt-1 font-semibold text-ink-800">
                        {item.manuscriptTitle ?? 'Manuscript'}
                      </p>
                      <p className="mt-1 text-sm text-ink-500">
                        {item.journal} · {invitationLabels[item.status]}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn btn-signal"
                      disabled={pendingId === item.id}
                      onClick={() => void handleRespond(item.id, 'accepted')}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={pendingId === item.id}
                      onClick={() => {
                        setDeclineId(item.id)
                        setDeclineReason('')
                      }}
                    >
                      Decline
                    </button>
                  </div>
                </div>

                {declineId === item.id ? (
                  <div className="mt-4 rounded-[var(--radius-md)] border border-line bg-paper-soft p-4">
                    <div className="field">
                      <label htmlFor={`decline-${item.id}`}>
                        Reason (optional)
                      </label>
                      <textarea
                        id={`decline-${item.id}`}
                        rows={3}
                        value={declineReason}
                        onChange={(e) => setDeclineReason(e.target.value)}
                        placeholder="Conflict of interest, unavailable, outside expertise…"
                        className="resize-y"
                      />
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        className="btn border-rose-600 bg-rose-50 text-rose-600"
                        disabled={pendingId === item.id}
                        onClick={() =>
                          void handleRespond(
                            item.id,
                            'declined',
                            declineReason.trim() || undefined,
                          )
                        }
                      >
                        Confirm decline
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => setDeclineId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </DataPanel>

      <p className="text-sm text-ink-500">
        Accepted assignments?{' '}
        <Link
          to="/reviewer/active"
          className="font-semibold text-signal-600 hover:text-signal-700"
        >
          Open active reviews
        </Link>
      </p>
    </div>
  )
}

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="m3 7 9 6 9-6" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  )
}
