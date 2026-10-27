import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { StatusBadge } from '../../components/StatusBadge'
import { PageHeader } from '../../components/ui'
import { useToast } from '../../components/ToastProvider'
import { apiFetch } from '../../lib/api'
import { fetchMyManuscripts, type ApiManuscript } from '../../lib/manuscripts'
import { WorkflowStageRail } from '../../components/workflow/WorkflowStageRail'

export function CopyeditQueuePage() {
  const toast = useToast()
  const [items, setItems] = useState<ApiManuscript[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    try {
      const manuscripts = await fetchMyManuscripts()
      setItems(
        manuscripts.filter((m: ApiManuscript) => m.status === 'copyediting'),
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load queue')
    }
  }

  async function approve(ms: ApiManuscript) {
    setBusyId(ms.id)
    try {
      const assignments = await apiFetch<{
        ok: boolean
        assignments: Array<{ id: string; status: string }>
      }>(`/api/workflow/${ms.id}/copyedit`)

      let assignmentId = assignments.assignments[0]?.id
      if (!assignmentId) {
        const users = await apiFetch<{
          ok: boolean
          users: Array<{ id: string; role: string }>
        }>('/api/users').catch(() => ({
          ok: true,
          users: [] as Array<{ id: string; role: string }>,
        }))
        const copyeditor =
          users.users.find((u) => u.role === 'copyeditor') ?? users.users[0]
        if (!copyeditor) {
          throw new Error('No copyeditor user available to assign.')
        }
        const created = await apiFetch<{
          ok: boolean
          assignment: { id: string }
        }>(`/api/workflow/${ms.id}/copyedit/assign`, {
          method: 'POST',
          body: JSON.stringify({ copyeditorId: copyeditor.id }),
        })
        assignmentId = created.assignment.id
      }

      await apiFetch(`/api/workflow/${ms.id}/copyedit/${assignmentId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'approved' }),
      })
      toast.success(`Copyediting approved for ${ms.id}.`)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Approval failed')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="page-stack animate-rise">
      <PageHeader
        eyebrow="Copyediting"
        title="Copyediting queue"
        description="Accepted manuscripts awaiting a clean-file approval before production."
      />

      <WorkflowStageRail status="copyediting" compact />

      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="surface p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold tracking-wide text-signal-600">
                    {item.id}
                  </p>
                  <StatusBadge status={item.status} compact />
                </div>
                <h2 className="mt-2 font-display text-xl font-semibold tracking-tight text-ink-800">
                  {item.title}
                </h2>
                <p className="mt-1 text-sm text-ink-500">
                  {item.authors} · {item.journal}
                  {item.section ? ` · ${item.section.title}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                <Link
                  className="btn btn-ghost"
                  to={`/editor/manuscript/${item.id}`}
                >
                  Open manuscript
                </Link>
                <button
                  type="button"
                  className="btn btn-signal"
                  disabled={busyId === item.id}
                  onClick={() => void approve(item)}
                >
                  {busyId === item.id ? 'Working…' : 'Approve clean file'}
                </button>
              </div>
            </div>
          </li>
        ))}
        {items.length === 0 ? (
          <li className="surface p-8 text-center text-sm text-ink-400">
            No manuscripts in copyediting right now.
          </li>
        ) : null}
      </ul>
    </div>
  )
}
