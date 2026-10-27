import { useEffect, useState } from 'react'
import { useToast } from '../ToastProvider'
import { Link } from 'react-router-dom'
import { startProduction } from '../../lib/manuscripts'
import {
  assignCopyeditor,
  fetchCopyedits,
  fetchDirectoryUsers,
  updateCopyedit,
  type CopyeditAssignment,
} from '../../lib/workflow'

const statusLabel: Record<string, string> = {
  assigned: 'Assigned',
  in_progress: 'In progress',
  author_query: 'Author query',
  approved: 'Approved',
}

export function CopyeditPanel({
  manuscriptId,
  manuscriptStatus,
  canAssign,
  canUpdate,
  canSendToProduction,
  onChanged,
}: {
  manuscriptId: string
  manuscriptStatus: string
  canAssign?: boolean
  canUpdate?: boolean
  canSendToProduction?: boolean
  onChanged?: () => void
}) {
  const toast = useToast()
  const [assignments, setAssignments] = useState<CopyeditAssignment[]>([])
  const [copyeditors, setCopyeditors] = useState<
    Array<{ id: string; name: string; email: string }>
  >([])
  const [copyeditorId, setCopyeditorId] = useState('')
  const [notes, setNotes] = useState('')
  const [queries, setQueries] = useState('')
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)

  const showPanel = ['accepted', 'copyediting', 'in_production', 'proof_sent', 'ready_for_publication', 'published'].includes(
    manuscriptStatus,
  )

  async function reload() {
    const list = await fetchCopyedits(manuscriptId)
    setAssignments(list)
  }

  useEffect(() => {
    if (!showPanel) return
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        await reload()
        if (canAssign) {
          const users = await fetchDirectoryUsers().catch(() => [])
          const list = users.filter(
            (u) => u.role === 'copyeditor' || u.role === 'editor' || u.role === 'journal_manager',
          )
          if (!cancelled) {
            setCopyeditors(list.map((u) => ({ id: u.id, name: u.name, email: u.email })))
            if (list[0]) setCopyeditorId(list[0].id)
          }
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : 'Failed to load copyediting')
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
  }, [manuscriptId, showPanel, canAssign])

  if (!showPanel) return null

  async function handleAssign() {
    if (!copyeditorId) {
      toast.error('Choose a copyeditor.')
      return
    }
    setPending(true)
    try {
      await assignCopyeditor(manuscriptId, copyeditorId, notes || undefined)
      setNotes('')
      toast.success('Copyeditor assigned.')
      await reload()
      onChanged?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Assign failed')
    } finally {
      setPending(false)
    }
  }

  async function handleUpdate(
    assignmentId: string,
    status: string,
  ) {
    setPending(true)
    try {
      await updateCopyedit(manuscriptId, assignmentId, {
        status,
        authorQueries: queries || undefined,
        notes: notes || undefined,
      })
      toast.success('Copyediting updated.')
      await reload()
      onChanged?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setPending(false)
    }
  }

  async function handleSendToProduction() {
    setPending(true)
    try {
      await startProduction(manuscriptId, 'Handed to production after copyedit approval.')
      toast.success('Sent to production.')
      onChanged?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not start production')
    } finally {
      setPending(false)
    }
  }

  const latest = assignments[0]
  const readyForProduction =
    manuscriptStatus === 'copyediting' &&
    Boolean(latest && latest.status === 'approved')

  return (
    <div className="surface space-y-4 p-5 sm:p-6">
      <div>
        <h2 className="text-sm font-semibold tracking-wide text-ink-500 uppercase">
          Copyediting
        </h2>
        <p className="mt-1 text-sm text-ink-500">
          Clean-file stage between acceptance and production.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-ink-400">Loading…</p>
      ) : latest ? (
        <div className="rounded-[var(--radius-md)] border border-line bg-paper-soft p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-semibold text-ink-800">{latest.copyeditor.name}</p>
              <p className="text-xs text-ink-400">{latest.copyeditor.email}</p>
            </div>
            <span className="rounded-md bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 ring-1 ring-teal-50">
              {statusLabel[latest.status] ?? latest.status}
            </span>
          </div>
          {latest.authorQueries ? (
            <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Author queries: {latest.authorQueries}
            </p>
          ) : null}
          {latest.notes ? (
            <p className="mt-2 text-sm text-ink-600">{latest.notes}</p>
          ) : null}

          {canUpdate && latest.status !== 'approved' ? (
            <div className="mt-4 space-y-3 border-t border-line pt-4">
              <div className="field">
                <label htmlFor="ce-queries">Author queries</label>
                <textarea
                  id="ce-queries"
                  rows={2}
                  value={queries}
                  onChange={(e) => setQueries(e.target.value)}
                  className="resize-y"
                  placeholder="Questions for the author…"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={pending}
                  onClick={() => void handleUpdate(latest.id, 'in_progress')}
                >
                  Mark in progress
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={pending}
                  onClick={() => void handleUpdate(latest.id, 'author_query')}
                >
                  Send author query
                </button>
                <button
                  type="button"
                  className="btn btn-signal"
                  disabled={pending}
                  onClick={() => void handleUpdate(latest.id, 'approved')}
                >
                  Approve clean file
                </button>
              </div>
            </div>
          ) : null}

          {readyForProduction && canSendToProduction ? (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
              <button
                type="button"
                className="btn btn-signal"
                disabled={pending}
                onClick={() => void handleSendToProduction()}
              >
                {pending ? 'Sending…' : 'Send to production'}
              </button>
              <Link
                to="/production/queue"
                className="text-sm font-semibold text-signal-700"
              >
                Open production queue →
              </Link>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="rounded-md bg-paper-soft px-3 py-3 text-sm text-ink-500">
          No copyeditor assigned yet.
        </p>
      )}

      {canAssign && (!latest || latest.status === 'approved') && manuscriptStatus !== 'published' ? (
        <div className="space-y-3 border-t border-line pt-4">
          <div className="field">
            <label htmlFor="ce-user">Copyeditor</label>
            <select
              id="ce-user"
              value={copyeditorId}
              onChange={(e) => setCopyeditorId(e.target.value)}
            >
              {copyeditors.length === 0 ? (
                <option value="">No copyeditor accounts found</option>
              ) : (
                copyeditors.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="field">
            <label htmlFor="ce-notes">Notes</label>
            <input
              id="ce-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional assignment notes"
            />
          </div>
          <button
            type="button"
            className="btn btn-signal"
            disabled={pending || !copyeditorId}
            onClick={() => void handleAssign()}
          >
            {pending ? 'Assigning…' : 'Assign copyeditor'}
          </button>
        </div>
      ) : null}

    </div>
  )
}
