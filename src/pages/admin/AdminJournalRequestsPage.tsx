import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/ui'
import { useToast } from '../../components/ToastProvider'
import { apiFetch } from '../../lib/api'

type RequestRow = {
  id: string
  proposedCode: string
  proposedName: string
  issn: string | null
  description: string | null
  contactEmail: string | null
  status: 'pending' | 'approved' | 'rejected'
  adminNote: string | null
  createdAt: string
  requester?: { id: string; name: string; email: string }
  journal: { id: string; code: string; name: string } | null
}

export function AdminJournalRequestsPage() {
  const toast = useToast()
  const [rows, setRows] = useState<RequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})

  async function reload() {
    const data = await apiFetch<{ ok: boolean; requests: RequestRow[] }>(
      '/api/journal-requests',
    )
    setRows(data.requests)
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        await reload()
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : 'Failed to load requests')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [toast])

  async function approve(id: string) {
    setBusyId(id)
    try {
      await apiFetch(`/api/journal-requests/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ adminNote: notes[id]?.trim() || null }),
      })
      toast.success('Journal approved and created. Requester is journal manager.')
      await reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Approve failed')
    } finally {
      setBusyId(null)
    }
  }

  async function reject(id: string) {
    setBusyId(id)
    try {
      await apiFetch(`/api/journal-requests/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ adminNote: notes[id]?.trim() || null }),
      })
      toast.success('Request rejected.')
      await reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reject failed')
    } finally {
      setBusyId(null)
    }
  }

  const pending = rows.filter((r) => r.status === 'pending')
  const others = rows.filter((r) => r.status !== 'pending')

  return (
    <div className="page-stack animate-rise">
      <PageHeader
        title="Journal requests"
        description="Users request a journal workspace. Approve to create the journal and make them journal manager (EasyChair-style)."
        actions={
          <Link to="/admin/journals" className="btn btn-ghost">
            All journals
          </Link>
        }
      />

      {loading ? (
        <p className="text-sm text-ink-500">Loading…</p>
      ) : (
        <>
          <section className="surface p-5 sm:p-6">
            <h2 className="text-sm font-semibold tracking-wide text-ink-500 uppercase">
              Pending ({pending.length})
            </h2>
            {pending.length === 0 ? (
              <p className="mt-3 text-sm text-ink-500">No pending requests.</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {pending.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-[var(--radius-md)] border border-line bg-paper-soft p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-ink-800">
                          {item.proposedName}
                        </p>
                        <p className="text-xs text-ink-500">
                          Code <span className="font-mono">{item.proposedCode}</span>
                          {item.issn ? ` · ISSN ${item.issn}` : ''}
                        </p>
                        <p className="mt-1 text-sm text-ink-600">
                          From {item.requester?.name} ({item.requester?.email})
                        </p>
                        {item.description ? (
                          <p className="mt-2 text-sm text-ink-600 whitespace-pre-wrap">
                            {item.description}
                          </p>
                        ) : null}
                      </div>
                      <p className="text-xs text-ink-400">
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="mt-3 field">
                      <label htmlFor={`note-${item.id}`}>Note to requester (optional)</label>
                      <input
                        id={`note-${item.id}`}
                        value={notes[item.id] ?? ''}
                        onChange={(e) =>
                          setNotes((n) => ({ ...n, [item.id]: e.target.value }))
                        }
                        placeholder="Shown in email if you approve or reject"
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn btn-signal"
                        disabled={busyId === item.id}
                        onClick={() => void approve(item.id)}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="btn border-rose-200 bg-rose-50 text-rose-700"
                        disabled={busyId === item.id}
                        onClick={() => void reject(item.id)}
                      >
                        Reject
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {others.length > 0 ? (
            <section className="surface p-5 sm:p-6">
              <h2 className="text-sm font-semibold tracking-wide text-ink-500 uppercase">
                History
              </h2>
              <ul className="mt-3 divide-y divide-line">
                {others.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                  >
                    <span>
                      <span className="font-semibold text-ink-800">
                        {item.proposedName}
                      </span>{' '}
                      <span className="text-ink-400">({item.proposedCode})</span>
                    </span>
                    <span className="font-medium capitalize text-ink-600">
                      {item.status}
                      {item.journal ? (
                        <>
                          {' '}
                          ·{' '}
                          <Link
                            to={`/j/${item.journal.code}`}
                            className="text-signal-700"
                          >
                            public page
                          </Link>
                        </>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  )
}
