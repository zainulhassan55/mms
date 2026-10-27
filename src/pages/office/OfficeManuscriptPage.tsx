import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { StatusBadge } from '../../components/StatusBadge'
import { useToast } from '../../components/ToastProvider'
import { DetailHeader } from '../../components/ui'
import { statusLabels } from '../../data/mock'
import {
  applyScreeningAction,
  fetchEditors,
  fetchManuscript,
  type ApiEditor,
  type ApiManuscript,
} from '../../lib/manuscripts'

const checklistDefaults = {
  format: false,
  scope: false,
  ethics: false,
  plagiarism: false,
}

export function OfficeManuscriptPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [manuscript, setManuscript] = useState<ApiManuscript | null>(null)
  const [editors, setEditors] = useState<ApiEditor[]>([])
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)
  const [checklist, setChecklist] = useState(checklistDefaults)
  const [notes, setNotes] = useState('')
  const [editorId, setEditorId] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [detail, editorList] = await Promise.all([
          fetchManuscript(id!),
          fetchEditors(),
        ])
        if (cancelled) return
        setManuscript(detail.manuscript)
        setEditors(editorList)
        const preferred =
          editorList.find((item) =>
            item.email.toLowerCase().includes('e.vargas'),
          ) ?? editorList[0]
        setEditorId(preferred?.id ?? '')
        setNotes(detail.manuscript.officeNotes ?? '')
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Manuscript not found.'
          setManuscript(null)
          setError(message)
          toast.error(message)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [id, toast])

  const checklistComplete = useMemo(
    () => Object.values(checklist).every(Boolean),
    [checklist],
  )

  if (loading) {
    return (
      <div className="py-16 text-center text-sm text-ink-500 animate-rise">
        Loading manuscript…
      </div>
    )
  }

  if (!manuscript) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-16 text-center animate-rise">
        <h1 className="font-display text-3xl font-semibold text-ink-800">
          Manuscript not found
        </h1>
        <p className="text-ink-500">{error}</p>
        <Link to="/office/screening" className="btn btn-signal">
          Back to screening queue
        </Link>
      </div>
    )
  }

  const canAct = ['submitted', 'formatting_requested'].includes(manuscript.status)

  function toggleCheck(key: keyof typeof checklistDefaults) {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  async function runAction(
    action: 'pass' | 'formatting' | 'desk_reject',
    successMessage: string,
  ) {
    if (!id) return
    setPending(true)
    try {
      await applyScreeningAction(id, {
        action,
        editorId: action === 'pass' ? editorId : undefined,
        notes: notes.trim() || undefined,
        rejectReason: action === 'desk_reject' ? rejectReason.trim() : undefined,
      })
      toast.success(successMessage)
      window.setTimeout(() => navigate('/office/screening'), 700)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed.')
      setPending(false)
    }
  }

  function handlePass() {
    if (!checklistComplete) {
      toast.error('Complete the screening checklist before assigning an editor.')
      return
    }
    if (!editorId) {
      toast.error('Please choose an editor.')
      return
    }
    void runAction(
      'pass',
      'Passed screening. The assigned associate editor can now invite reviewers.',
    )
  }

  function handleFormatting() {
    if (!notes.trim()) {
      toast.error('Add internal notes describing the formatting issues.')
      return
    }
    void runAction('formatting', 'Formatting revision requested from author.')
  }

  function handleReject() {
    if (!rejectReason.trim()) {
      toast.error('Provide a desk-reject reason for the author letter.')
      return
    }
    void runAction('desk_reject', 'Manuscript desk-rejected.')
  }

  return (
    <div className="page-stack animate-rise">
      <DetailHeader
        backTo="/office/screening"
        backLabel="← Back to screening queue"
        meta={
          <>
            {manuscript.id}
            <span className="text-ink-300"> · </span>
            <span className="text-ink-500">{manuscript.journal}</span>
          </>
        }
        title={manuscript.title}
        subtitle={
          <>
            {manuscript.authors} · {manuscript.articleType} · Submitted{' '}
            {manuscript.submittedAt ?? '—'}
          </>
        }
        badge={<StatusBadge status={manuscript.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.9fr]">
        <div className="space-y-4">
          <div className="surface p-5 sm:p-6">
            <h2 className="text-sm font-semibold tracking-wide text-ink-500 uppercase">
              Screening checklist
            </h2>
            <ul className="mt-4 space-y-3">
              {(
                [
                  ['format', 'Format complies with journal guidelines'],
                  ['scope', 'Topic is within journal scope'],
                  ['ethics', 'Ethics / COI / funding statements present'],
                  ['plagiarism', 'Plagiarism check recorded (manual for MVP)'],
                ] as const
              ).map(([key, label]) => (
                <li key={key}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-md border border-line bg-paper-soft px-3 py-3">
                    <input
                      type="checkbox"
                      checked={checklist[key]}
                      onChange={() => toggleCheck(key)}
                      disabled={!canAct || pending}
                      className="mt-0.5 accent-[var(--color-signal-600)]"
                    />
                    <span className="text-sm font-medium text-ink-800">{label}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          {manuscript.abstract ? (
            <div className="surface p-5 sm:p-6">
              <h2 className="text-sm font-semibold tracking-wide text-ink-500 uppercase">
                Abstract
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                {manuscript.abstract}
              </p>
            </div>
          ) : null}

          <div className="surface p-5 sm:p-6">
            <h2 className="text-sm font-semibold tracking-wide text-ink-500 uppercase">
              Current status
            </h2>
            <p className="mt-2 text-lg font-semibold text-ink-800">
              {statusLabels[manuscript.status]}
            </p>
            {manuscript.assignedEditor ? (
              <p className="mt-2 text-sm text-ink-500">
                Assigned editor: {manuscript.assignedEditor}
              </p>
            ) : null}
            {manuscript.officeNotes ? (
              <p className="mt-3 rounded-md bg-paper px-3 py-2 text-sm text-ink-600">
                Previous notes: {manuscript.officeNotes}
              </p>
            ) : null}
            {manuscript.rejectReason ? (
              <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-600">
                Reject reason: {manuscript.rejectReason}
              </p>
            ) : null}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="surface p-5 sm:p-6">
            <h2 className="text-sm font-semibold tracking-wide text-ink-500 uppercase">
              Office actions
            </h2>
            <p className="mt-2 text-sm text-ink-500">
              Internal notes are not visible to authors.
            </p>

            <div className="field mt-4">
              <label htmlFor="notes">Internal notes</label>
              <textarea
                id="notes"
                rows={4}
                value={notes}
                disabled={!canAct || pending}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Checklist findings, plagiarism score, scope concerns…"
                className="resize-y"
              />
            </div>

            <div className="field mt-4">
              <label htmlFor="editor">Assign associate editor (on pass)</label>
              <p className="mb-2 text-xs text-ink-500">
                Assign an <span className="font-semibold">associate editor</span>
                (not a reviewer). Reviewers are invited later by that editor.
              </p>
              <select
                id="editor"
                value={editorId}
                disabled={!canAct || pending || editors.length === 0}
                onChange={(e) => setEditorId(e.target.value)}
              >
                {editors.length === 0 ? (
                  <option value="">No editors available</option>
                ) : (
                  editors.map((editor) => (
                    <option key={editor.id} value={editor.id}>
                      {editor.name} (Editor) — {editor.email}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="field mt-4">
              <label htmlFor="rejectReason">Desk-reject reason</label>
              <textarea
                id="rejectReason"
                rows={3}
                value={rejectReason}
                disabled={!canAct || pending}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Shared with the author if desk rejected"
                className="resize-y"
              />
            </div>

            {canAct ? (
              <div className="mt-5 space-y-3">
                <button
                  type="button"
                  className="btn btn-signal w-full"
                  disabled={pending}
                  onClick={handlePass}
                >
                  {pending ? 'Saving…' : 'Pass & assign editor'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost w-full"
                  disabled={pending}
                  onClick={handleFormatting}
                >
                  Request formatting fix
                </button>
                <button
                  type="button"
                  className="btn w-full border-rose-600 bg-rose-50 text-rose-600 hover:bg-rose-50"
                  disabled={pending}
                  onClick={handleReject}
                >
                  Desk reject
                </button>
              </div>
            ) : (
              <p className="mt-5 rounded-md bg-paper px-3 py-2 text-sm text-ink-500">
                Screening actions are locked for this status.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
