import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { StatusBadge } from '../../components/StatusBadge'
import { useToast } from '../../components/ToastProvider'
import { ReviewReports } from '../../components/ReviewReports'
import { DetailHeader } from '../../components/ui'
import {
  invitationLabels,
  recommendationLabels,
  statusLabels,
  type ReviewRecommendation,
} from '../../data/mock'
import {
  applyScreeningAction,
  assignEditor,
  fetchEditors,
  fetchManuscript,
  fetchReviewers,
  inviteReviewer,
  recordEditorialDecision,
  remindInvitation,
  routeRevisionToEditor,
  submitEditorRecommendation,
  withdrawInvitation,
  type ApiActivity,
  type ApiEditor,
  type ApiEditorRecommendation,
  type ApiInvitation,
  type ApiManuscript,
  type ApiReview,
  type ApiReviewer,
} from '../../lib/manuscripts'
import { WorkflowStageRail } from '../../components/workflow/WorkflowStageRail'
import { EditorSubmissionMaterials } from '../../components/workflow/EditorSubmissionMaterials'
import { ReviewRoundsPanel } from '../../components/workflow/ReviewRoundsPanel'
import { CopyeditPanel } from '../../components/workflow/CopyeditPanel'
import { DiscussionsPanel } from '../../components/workflow/DiscussionsPanel'

const decisions: ReviewRecommendation[] = [
  'accept',
  'minor_revision',
  'major_revision',
  'reject',
]

const checklistDefaults = {
  format: false,
  scope: false,
  ethics: false,
  plagiarism: false,
}

export function EditorManuscriptPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const toast = useToast()
  const inviteFeedbackRef = useRef<HTMLDivElement | null>(null)
  const [manuscript, setManuscript] = useState<ApiManuscript | null>(null)
  const [invitations, setInvitations] = useState<ApiInvitation[]>([])
  const [reviews, setReviews] = useState<ApiReview[]>([])
  const [editorRecommendations, setEditorRecommendations] = useState<
    ApiEditorRecommendation[]
  >([])
  const [reviewers, setReviewers] = useState<ApiReviewer[]>([])
  const [editors, setEditors] = useState<ApiEditor[]>([])
  const [activity, setActivity] = useState<ApiActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)
  const [inviting, setInviting] = useState(false)

  const [reviewerId, setReviewerId] = useState('')
  const [assignEditorId, setAssignEditorId] = useState('')
  const [deadlineDays, setDeadlineDays] = useState(21)
  const [decision, setDecision] =
    useState<ReviewRecommendation>('minor_revision')
  const [decisionLetter, setDecisionLetter] = useState('')
  const [editorNote, setEditorNote] = useState('')
  const [revisionDays, setRevisionDays] = useState(21)
  const isEic = user?.role === 'admin' || user?.role === 'journal_manager'
  const [checklist, setChecklist] = useState(checklistDefaults)
  const [screeningNotes, setScreeningNotes] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [loadError, setLoadError] = useState<string | null>(null)

  async function reload() {
    if (!id) return
    const [detail, reviewerList, editorList] = await Promise.all([
      fetchManuscript(id),
      fetchReviewers(),
      fetchEditors(),
    ])
    setManuscript(detail.manuscript)
    setInvitations(detail.invitations ?? [])
    setReviews(detail.reviews ?? [])
    setEditorRecommendations(detail.editorRecommendations ?? [])
    setActivity(detail.activity ?? [])
    setReviewers(reviewerList)
    setEditors(editorList)
    if (!assignEditorId) {
      const selfId =
        user?.id && editorList.some((item) => item.id === user.id)
          ? user.id
          : undefined
      setAssignEditorId(
        detail.manuscript.assignedEditorId ??
          selfId ??
          editorList[0]?.id ??
          '',
      )
    }
  }

  useEffect(() => {
    if (!id) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setLoadError(null)
      try {
        await reload()
      } catch (err) {
        if (!cancelled) {
          setManuscript(null)
          const text =
            err instanceof Error ? err.message : 'Manuscript not found.'
          setLoadError(text)
          toast.error(text)
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
  }, [id])

  const availableReviewers = useMemo(() => {
    const taken = new Set(
      invitations
        .filter((item) => item.status !== 'declined')
        .map((item) => item.reviewerId),
    )
    return reviewers.filter((item) => !taken.has(item.id))
  }, [invitations, reviewers])

  useEffect(() => {
    if (
      availableReviewers.length > 0 &&
      !availableReviewers.some((item) => item.id === reviewerId)
    ) {
      setReviewerId(availableReviewers[0].id)
    }
  }, [availableReviewers, reviewerId])

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
        <p className="text-ink-500">{loadError}</p>
        <Link to="/editor/queue" className="btn btn-signal">
          Back to editor queue
        </Link>
      </div>
    )
  }

  const needsScreening = ['submitted', 'formatting_requested'].includes(
    manuscript.status,
  )
  const canInvite = manuscript.status === 'under_review'
  const needsEicRouting = manuscript.status === 'revision_submitted'
  const canRecommend =
    manuscript.status === 'under_review' && !isEic
  const canDecideStatus =
    isEic && manuscript.status === 'under_review'
  const reviewCount = reviews.length
  const hasReviews = reviewCount > 0
  const openInviteCount = invitations.filter(
    (item) =>
      (item.status === 'sent' || item.status === 'accepted') && !item.review,
  ).length
  const canDecide = canDecideStatus && hasReviews
  const canRecommendAction = canRecommend && hasReviews
  const canAccept = canDecide && openInviteCount === 0
  const decisionOptions = canAccept
    ? decisions
    : decisions.filter((item) => item !== 'accept')
  const selectedDecision = decisionOptions.includes(decision)
    ? decision
    : decisionOptions[0]
  const needsRevisionDeadline =
    selectedDecision === 'minor_revision' ||
    selectedDecision === 'major_revision'
  const awaitingDecision =
    manuscript.status === 'under_review' && hasReviews && openInviteCount === 0
  const checklistComplete = Object.values(checklist).every(Boolean)
  const postAccept = [
    'accepted',
    'copyediting',
    'in_production',
    'proof_sent',
    'ready_for_publication',
    'published',
  ].includes(manuscript.status)

  async function handleScreening(action: 'pass' | 'formatting' | 'desk_reject') {
    if (!id) return
    if (action === 'pass' && !checklistComplete) {
      toast.warning('Complete the screening checklist before passing.')
      return
    }
    if (action === 'formatting' && !screeningNotes.trim()) {
      toast.warning('Add notes describing the formatting issues.')
      return
    }
    if (action === 'desk_reject' && !rejectReason.trim()) {
      toast.warning('Provide a desk-reject reason for the author.')
      return
    }

    setPending(true)
    try {
      const updated = await applyScreeningAction(id, {
        action,
        editorId:
          action === 'pass' && assignEditorId ? assignEditorId : undefined,
        notes: screeningNotes.trim() || undefined,
        rejectReason:
          action === 'desk_reject' ? rejectReason.trim() : undefined,
      })
      setManuscript(updated)
      if (action === 'pass') {
        toast.success('Screening passed — you can invite reviewers now.')
      } else if (action === 'formatting') {
        toast.success('Formatting revision requested.')
      } else {
        toast.success('Manuscript desk-rejected.')
      }
      try {
        await reload()
      } catch (reloadErr) {
        console.warn('Reload after screening failed', reloadErr)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Screening action failed.')
    } finally {
      setPending(false)
    }
  }

  async function handleInvite() {
    if (!id) {
      toast.error('Manuscript id is missing from the URL.')
      return
    }
    if (manuscript?.status !== 'under_review') {
      toast.warning(
        'Pass screening first. Invitations are only available while under review.',
      )
      inviteFeedbackRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
      return
    }

    const selected =
      availableReviewers.find((item) => item.id === reviewerId) ??
      availableReviewers[0]
    if (!selected) {
      toast.warning('Please choose a reviewer.')
      inviteFeedbackRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
      return
    }

    setInviting(true)
    try {
      const invitation = await inviteReviewer(id, {
        reviewerId: selected.id,
        deadlineDays,
      })
      setReviewerId(selected.id)
      toast.success(`Invitation sent to ${invitation.reviewerName}.`)
      await reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invite failed.')
      inviteFeedbackRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    } finally {
      setInviting(false)
    }
  }

  async function handleEditorRecommendation() {
    if (!id) return
    if (!hasReviews) {
      toast.warning('Wait for at least one reviewer report before recommending.')
      return
    }
    if (!editorNote.trim()) {
      toast.warning('Add a note for the Editor in Chief.')
      return
    }
    setPending(true)
    try {
      await submitEditorRecommendation(id, {
        recommendation: selectedDecision,
        note: editorNote.trim(),
      })
      setEditorNote('')
      toast.success(
        'Recommendation sent to the Editor in Chief. The author is not notified yet.',
      )
      await reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Recommendation failed.')
    } finally {
      setPending(false)
    }
  }

  async function handleDecision() {
    if (!id) return
    if (!isEic) {
      toast.error('Only the Editor in Chief can send the final decision to the author.')
      return
    }
    if (!hasReviews) {
      toast.warning(
        'Invite reviewers and wait for at least one review before recording a decision.',
      )
      return
    }
    if (selectedDecision === 'accept' && openInviteCount > 0) {
      toast.warning('Cannot accept while review invitations are still open.')
      return
    }
    setPending(true)
    try {
      const updated = await recordEditorialDecision(id, {
        decision: selectedDecision,
        letter: decisionLetter,
        revisionDays:
          selectedDecision === 'minor_revision' ||
          selectedDecision === 'major_revision'
            ? revisionDays
            : undefined,
      })
      setManuscript(updated)
      setDecisionLetter('')
      if (selectedDecision === 'accept') {
        toast.success('Accepted — moved to copyediting. Assign a copyeditor below.')
      } else if (selectedDecision === 'reject') {
        toast.success('Rejected. The author will see this on their dashboard.')
      } else {
        toast.success(
          'Revision requested. The author will upload a revised manuscript from their account.',
        )
      }
      await reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Decision failed.')
    } finally {
      setPending(false)
    }
  }

  async function handleRouteRevision() {
    if (!id) return
    setPending(true)
    try {
      const updated = await routeRevisionToEditor(
        id,
        assignEditorId || undefined,
      )
      setManuscript(updated)
      toast.success('Revision routed to editor — they can invite reviewers.')
      await reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not route revision.')
    } finally {
      setPending(false)
    }
  }

  async function handleAssignEditor() {
    if (!id || !assignEditorId) return
    setPending(true)
    try {
      const updated = await assignEditor(id, assignEditorId)
      setManuscript(updated)
      toast.success('Editor assigned.')
      await reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not assign editor')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="page-stack mx-auto max-w-4xl animate-rise">
      <DetailHeader
        backTo="/editor/queue"
        backLabel="← Back to editorial queue"
        meta={
          <>
            {manuscript.id}
            <span className="text-ink-300"> · </span>
            <span className="text-ink-500">
              {manuscript.assignedEditor ?? 'Unassigned'} · v{manuscript.version}
            </span>
          </>
        }
        title={manuscript.title}
        subtitle={
          <>
            {manuscript.authors} · {manuscript.journal}
            {manuscript.section ? ` · ${manuscript.section.title}` : ''}
          </>
        }
        badge={<StatusBadge status={manuscript.status} />}
      />

      <WorkflowStageRail status={manuscript.status} />

      <EditorSubmissionMaterials
        manuscript={manuscript}
        onChanged={() => void reload()}
      />

      {awaitingDecision ? (
        <div className="rounded-[var(--radius-lg)] border border-signal-200 bg-signal-50 px-4 py-3 text-sm text-signal-800">
          <p className="font-semibold">
            {reviewCount} review{reviewCount === 1 ? '' : 's'} received — decision
            needed
          </p>
          <p className="mt-1 text-ink-600">
            Accept moves the manuscript to copyediting; you can also request a
            revision or reject.
          </p>
        </div>
      ) : null}

      {postAccept ? (
        <div className="rounded-[var(--radius-lg)] border border-signal-200 bg-signal-50 px-4 py-3 text-sm text-signal-800">
          <p className="font-semibold">
            {manuscript.status === 'copyediting'
              ? 'Accepted — in copyediting'
              : manuscript.status === 'accepted'
                ? 'Accepted — ready for copyediting'
                : `Production stage (${statusLabels[manuscript.status]})`}
          </p>
          <p className="mt-1 text-ink-600">
            {manuscript.status === 'copyediting'
              ? 'Approve the clean file below, then send to production.'
              : 'Continue with copyediting or production below.'}
          </p>
        </div>
      ) : null}

      {/* 1. Screening */}
      {needsScreening ? (
        <section className="rounded-[var(--radius-lg)] border border-signal-200 bg-paper p-5 sm:p-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <h2 className="font-display text-xl font-semibold text-ink-800">
              1. Initial screening
            </h2>
            <p className="text-sm text-ink-500">{statusLabels[manuscript.status]}</p>
          </div>
          <p className="mt-2 text-sm text-ink-500">
            Confirm checklist items, assign an editor, then pass to peer review —
            or request formatting / desk reject.
          </p>

          <ul className="mt-5 space-y-2.5">
            {(
              [
                ['format', 'Format complies with journal guidelines'],
                ['scope', 'Topic is within journal scope'],
                ['ethics', 'Ethics / COI / funding statements present'],
                ['plagiarism', 'Plagiarism check recorded'],
              ] as const
            ).map(([key, label]) => (
              <li key={key}>
                <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border border-line bg-paper-soft px-3.5 py-3">
                  <input
                    type="checkbox"
                    checked={checklist[key]}
                    onChange={() => {
                      setChecklist((prev) => ({ ...prev, [key]: !prev[key] }))
                    }}
                    disabled={pending}
                    className="mt-0.5 accent-[var(--color-signal-600)]"
                  />
                  <span className="text-sm font-medium text-ink-800">{label}</span>
                </label>
              </li>
            ))}
          </ul>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="field">
              <label htmlFor="assignOnPass">Assign editor (on pass)</label>
              <select
                id="assignOnPass"
                value={assignEditorId}
                disabled={pending || editors.length === 0}
                onChange={(e) => setAssignEditorId(e.target.value)}
              >
                {editors.length === 0 ? (
                  <option value="">No editors enrolled yet</option>
                ) : (
                  editors.map((editor) => (
                    <option key={editor.id} value={editor.id}>
                      {editor.name} ({editor.email})
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="field sm:col-span-2">
              <label htmlFor="screeningNotes">Internal notes</label>
              <textarea
                id="screeningNotes"
                rows={3}
                value={screeningNotes}
                disabled={pending}
                onChange={(e) => setScreeningNotes(e.target.value)}
                placeholder="Checklist findings, scope notes…"
                className="resize-y"
              />
            </div>
            <div className="field sm:col-span-2">
              <label htmlFor="rejectReason">Desk-reject reason (if rejecting)</label>
              <textarea
                id="rejectReason"
                rows={2}
                value={rejectReason}
                disabled={pending}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Shown to the author if desk rejected"
                className="resize-y"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2 border-t border-line pt-5 sm:flex-row">
            <button
              type="button"
              className="btn btn-signal"
              disabled={pending}
              onClick={() => void handleScreening('pass')}
            >
              {pending ? 'Saving…' : 'Pass screening'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={pending}
              onClick={() => void handleScreening('formatting')}
            >
              Request formatting fix
            </button>
            <button
              type="button"
              className="btn border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-50"
              disabled={pending}
              onClick={() => void handleScreening('desk_reject')}
            >
              Desk reject
            </button>
          </div>
        </section>
      ) : null}

      {/* 2. Assignment */}
      {!needsScreening ? (
        <section className="rounded-[var(--radius-lg)] border border-line bg-paper p-5 sm:p-6">
          <h2 className="font-display text-xl font-semibold text-ink-800">
            Assigned editor
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            Current:{' '}
            <span className="font-semibold text-ink-800">
              {manuscript.assignedEditor ?? 'Unassigned'}
            </span>
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="field min-w-0 flex-1">
              <label htmlFor="reassignEditor">Reassign</label>
              <select
                id="reassignEditor"
                value={assignEditorId}
                onChange={(e) => setAssignEditorId(e.target.value)}
                disabled={pending || editors.length === 0}
              >
                {editors.length === 0 ? (
                  <option value="">No editors enrolled</option>
                ) : (
                  editors.map((editor) => (
                    <option key={editor.id} value={editor.id}>
                      {editor.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            <button
              type="button"
              className="btn btn-ghost shrink-0"
              disabled={pending || !assignEditorId}
              onClick={() => void handleAssignEditor()}
            >
              Save assignment
            </button>
          </div>
        </section>
      ) : null}

      {/* 3. Peer review */}
      <section className="rounded-[var(--radius-lg)] border border-line bg-paper p-5 sm:p-6">
        <h2 className="font-display text-xl font-semibold text-ink-800">
          {needsScreening ? '2. Peer review' : 'Peer review'}
        </h2>
        <p className="mt-1 text-sm text-ink-500">
          Invite reviewers, track responses, and collect reports before a
          decision.
        </p>

        <div className="mt-5 space-y-5 border-t border-line pt-5">
          <div>
            <h3 className="text-xs font-semibold tracking-wide text-ink-400 uppercase">
              Invite reviewer
            </h3>
            {!canInvite ? (
              <p className="mt-3 rounded-[var(--radius-md)] bg-paper-soft px-3.5 py-3 text-sm text-ink-500">
                Invitations open after you pass screening (status: under review).
              </p>
            ) : availableReviewers.length === 0 ? (
              <p className="mt-3 rounded-[var(--radius-md)] bg-paper-soft px-3.5 py-3 text-sm text-ink-500">
                All directory reviewers already have open invitations.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_8rem_auto]">
                  <div className="field">
                    <label htmlFor="reviewer">Reviewer</label>
                    <select
                      id="reviewer"
                      value={reviewerId || availableReviewers[0]?.id || ''}
                      onChange={(e) => setReviewerId(e.target.value)}
                    >
                      {availableReviewers.map((reviewer) => (
                        <option key={reviewer.id} value={reviewer.id}>
                          {reviewer.name}
                          {reviewer.expertise
                            ? ` — ${reviewer.expertise}`
                            : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="deadline">Deadline</label>
                    <select
                      id="deadline"
                      value={deadlineDays}
                      onChange={(e) =>
                        setDeadlineDays(Number(e.target.value))
                      }
                    >
                      {[14, 21, 28, 35].map((days) => (
                        <option key={days} value={days}>
                          {days} days
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    className="btn btn-signal h-10 w-full shrink-0 whitespace-nowrap sm:w-auto"
                    disabled={inviting || availableReviewers.length === 0}
                    onClick={() => void handleInvite()}
                  >
                    {inviting ? 'Sending…' : 'Send invitation'}
                  </button>
                </div>
                <div ref={inviteFeedbackRef} />
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xs font-semibold tracking-wide text-ink-400 uppercase">
                Review invitations
              </h3>
              <span className="text-xs font-medium text-ink-400">
                {invitations.length}
              </span>
            </div>
            {invitations.length === 0 ? (
              <p className="mt-3 text-sm text-ink-400">No reviewers invited yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line rounded-[var(--radius-md)] border border-line">
                {invitations.map((item) => (
                  <li key={item.id} className="space-y-2 px-4 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-ink-800">
                          {item.reviewerName}
                        </p>
                        <p className="text-xs text-ink-500">{item.reviewerEmail}</p>
                        <p className="mt-1 text-xs text-ink-300">
                          Due {item.deadline} · Round {item.round}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-md px-2 py-0.5 text-[0.7rem] font-semibold ${
                          item.review
                            ? 'bg-signal-50 text-signal-700 ring-1 ring-signal-100'
                            : item.status === 'declined'
                              ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-100'
                              : 'bg-sky-50 text-sky-700 ring-1 ring-sky-100'
                        }`}
                      >
                        {item.review
                          ? recommendationLabels[
                              item.review
                                .recommendation as ReviewRecommendation
                            ] ?? item.review.recommendation
                          : invitationLabels[item.status]}
                      </span>
                    </div>
                    {!item.review &&
                    (item.status === 'sent' ||
                      item.status === 'accepted' ||
                      item.status === 'overdue') ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn btn-ghost text-xs"
                          disabled={pending}
                          onClick={() => {
                            void (async () => {
                              setPending(true)
                              try {
                                await remindInvitation(item.id)
                                toast.success(
                                  `Reminder sent to ${item.reviewerName}.`,
                                )
                                await reload()
                              } catch (err) {
                                toast.error(
                                  err instanceof Error
                                    ? err.message
                                    : 'Reminder failed',
                                )
                              } finally {
                                setPending(false)
                              }
                            })()
                          }}
                        >
                          Remind
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost text-xs text-rose-600"
                          disabled={pending}
                          onClick={() => {
                            void (async () => {
                              setPending(true)
                              try {
                                await withdrawInvitation(item.id)
                                toast.success('Invitation withdrawn.')
                                await reload()
                              } catch (err) {
                                toast.error(
                                  err instanceof Error
                                    ? err.message
                                    : 'Withdraw failed',
                                )
                              } finally {
                                setPending(false)
                              }
                            })()
                          }}
                        >
                          Withdraw
                        </button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {reviews.length > 0 ? (
            <ReviewReports reviews={reviews} title="Submitted reviews" />
          ) : (
            <p className="rounded-[var(--radius-md)] bg-paper-soft px-3.5 py-4 text-sm text-ink-500">
              No submitted reviews yet. After invitations are accepted, full
              reports appear here.
            </p>
          )}
        </div>
      </section>

      {needsEicRouting && isEic ? (
        <section className="rounded-[var(--radius-lg)] border border-violet-200 bg-paper p-5 sm:p-6">
          <h2 className="font-display text-xl font-semibold text-ink-800">
            Route author revision
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            The author submitted a revision. Assign (or confirm) a handling
            editor, then they can invite previous or new reviewers.
          </p>
          {manuscript.lastResponseLetter ? (
            <div className="mt-4 rounded-[var(--radius-md)] border border-line bg-paper-soft px-3.5 py-3 text-sm">
              <p className="text-xs font-semibold tracking-wide text-ink-400 uppercase">
                Author response letter
              </p>
              <p className="mt-1 whitespace-pre-wrap text-ink-700">
                {manuscript.lastResponseLetter}
              </p>
            </div>
          ) : null}
          <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="field">
              <label htmlFor="route-editor">Handling editor</label>
              <select
                id="route-editor"
                value={assignEditorId}
                onChange={(e) => setAssignEditorId(e.target.value)}
              >
                {editors.map((ed) => (
                  <option key={ed.id} value={ed.id}>
                    {ed.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="btn btn-signal"
              disabled={pending || !assignEditorId}
              onClick={() => void handleRouteRevision()}
            >
              {pending ? 'Routing…' : 'Route to editor'}
            </button>
          </div>
        </section>
      ) : null}

      {/* 4. Recommendation / EIC decision */}
      <section
        className={`rounded-[var(--radius-lg)] border bg-paper p-5 sm:p-6 ${
          awaitingDecision ? 'border-signal-300' : 'border-line'
        }`}
      >
        <h2 className="font-display text-xl font-semibold text-ink-800">
          {isEic ? 'Editor in Chief — final decision' : 'Recommend to Editor in Chief'}
        </h2>
        <p className="mt-1 text-sm text-ink-500">
          {isEic
            ? 'Reviewer reports and editor recommendations stay internal until you send the final decision to the author. You may override any recommendation.'
            : 'Propose a recommendation for the Editor in Chief. The author is not notified until the EIC records a final decision.'}
        </p>
        <p className="mt-1 text-sm text-ink-400">
          Status: {statusLabels[manuscript.status]}
        </p>

        {editorRecommendations.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {editorRecommendations.map((item) => (
              <li
                key={item.id}
                className="rounded-[var(--radius-md)] border border-line bg-paper-soft px-3.5 py-3 text-sm"
              >
                <p className="font-semibold text-ink-800">
                  {item.editorName}:{' '}
                  {recommendationLabels[
                    item.recommendation as ReviewRecommendation
                  ] ?? item.recommendation}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-ink-600">{item.note}</p>
                <p className="mt-1 text-xs text-ink-400">
                  Round {item.round} · {item.createdAt}
                </p>
              </li>
            ))}
          </ul>
        ) : null}

        {manuscript.decision && manuscript.decisionLetter ? (
          <div className="mt-4 rounded-[var(--radius-md)] border border-line bg-paper-soft px-3.5 py-3 text-sm">
            <p className="font-semibold text-ink-800">
              Latest EIC decision:{' '}
              {recommendationLabels[
                manuscript.decision as ReviewRecommendation
              ] ?? manuscript.decision}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-ink-600">
              {manuscript.decisionLetter}
            </p>
          </div>
        ) : null}

        {needsEicRouting && !isEic ? (
          <p className="mt-4 rounded-[var(--radius-md)] bg-violet-50 px-3.5 py-3 text-sm text-violet-800">
            Author revision is with the Editor in Chief. After they route it to
            you, invite reviewers for the next round.
          </p>
        ) : !hasReviews && manuscript.status === 'under_review' ? (
          <p className="mt-4 rounded-[var(--radius-md)] bg-amber-50 px-3.5 py-3 text-sm text-amber-800">
            Invite at least one reviewer and wait for their report before a
            recommendation or final decision.
          </p>
        ) : canRecommendAction ? (
          <div className="mt-5 space-y-4 border-t border-line pt-5">
            <div className="field">
              <label htmlFor="decision">Your recommendation</label>
              <select
                id="decision"
                value={selectedDecision}
                onChange={(e) =>
                  setDecision(e.target.value as ReviewRecommendation)
                }
              >
                {decisions.map((item) => (
                  <option key={item} value={item}>
                    {recommendationLabels[item]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="editorNote">Note for Editor in Chief</label>
              <textarea
                id="editorNote"
                rows={4}
                value={editorNote}
                onChange={(e) => setEditorNote(e.target.value)}
                placeholder="Summarize the reviews and your recommendation…"
                className="resize-y"
              />
            </div>
            <button
              type="button"
              className="btn btn-signal"
              disabled={pending}
              onClick={() => void handleEditorRecommendation()}
            >
              {pending ? 'Sending…' : 'Send recommendation to EIC'}
            </button>
          </div>
        ) : canDecide ? (
          <div className="mt-5 space-y-4 border-t border-line pt-5">
            {openInviteCount > 0 ? (
              <p className="rounded-[var(--radius-md)] bg-sky-50 px-3.5 py-3 text-sm text-sky-800">
                {openInviteCount} review invitation
                {openInviteCount === 1 ? ' is' : 's are'} still open. You can
                request revision or reject; Accept requires all open invitations
                to have a report.
              </p>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="field">
                <label htmlFor="eic-decision">Final decision</label>
                <select
                  id="eic-decision"
                  value={selectedDecision}
                  onChange={(e) =>
                    setDecision(e.target.value as ReviewRecommendation)
                  }
                >
                  {decisionOptions.map((item) => (
                    <option key={item} value={item}>
                      {recommendationLabels[item]}
                    </option>
                  ))}
                </select>
              </div>
              {needsRevisionDeadline ? (
                <div className="field">
                  <label htmlFor="revisionDays">Author deadline (days)</label>
                  <select
                    id="revisionDays"
                    value={revisionDays}
                    onChange={(e) => setRevisionDays(Number(e.target.value))}
                  >
                    {[14, 21, 30, 45].map((days) => (
                      <option key={days} value={days}>
                        {days} days
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>
            <div className="field">
              <label htmlFor="decisionLetter">Decision letter to author</label>
              <textarea
                id="decisionLetter"
                rows={5}
                value={decisionLetter}
                onChange={(e) => setDecisionLetter(e.target.value)}
                placeholder="Letter to the corresponding author…"
                className="resize-y"
              />
            </div>
            <button
              type="button"
              className="btn btn-signal"
              disabled={pending}
              onClick={() => void handleDecision()}
            >
              {pending ? 'Saving…' : 'Send final decision to author'}
            </button>
          </div>
        ) : manuscript.status === 'under_review' && isEic && !hasReviews ? null : (
          <p className="mt-4 text-sm text-ink-500">
            {isEic
              ? 'Final decisions are available while the manuscript is under review and at least one report is in.'
              : 'Recommendations are available while under review after reports arrive.'}
          </p>
        )}
      </section>

      <ReviewRoundsPanel manuscriptId={manuscript.id} canManage />

      <CopyeditPanel
        manuscriptId={manuscript.id}
        manuscriptStatus={manuscript.status}
        canAssign
        canUpdate
        canSendToProduction
        onChanged={() => void reload()}
      />

      <DiscussionsPanel manuscriptId={manuscript.id} />

      <section className="rounded-[var(--radius-lg)] border border-line bg-paper p-5 sm:p-6">
        <h2 className="font-display text-xl font-semibold text-ink-800">
          History
        </h2>
        <ul className="mt-4 space-y-0">
          {activity.map((event, index) => (
            <li
              key={event.id}
              className="flex gap-3 border-b border-line py-3 last:border-0"
            >
              <span
                className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                  index === 0
                    ? 'bg-signal-600 ring-4 ring-signal-100'
                    : 'bg-ink-300'
                }`}
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink-800">{event.label}</p>
                <p className="mt-0.5 text-sm text-ink-500">{event.detail}</p>
                <p className="mt-1 text-xs text-ink-300">{event.at}</p>
              </div>
            </li>
          ))}
          {activity.length === 0 ? (
            <li className="py-2 text-sm text-ink-400">No activity yet.</li>
          ) : null}
        </ul>
      </section>

    </div>
  )
}
