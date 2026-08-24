import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { StatusBadge } from '../../components/StatusBadge'
import { Toast } from '../../components/Toast'
import { ReviewReports } from '../../components/ReviewReports'
import { DataPanel, DetailHeader } from '../../components/ui'
import {
  invitationLabels,
  recommendationLabels,
  statusLabels,
  type ReviewRecommendation,
} from '../../data/mock'
import {
  applyScreeningAction,
  fetchManuscript,
  fetchReviewers,
  inviteReviewer,
  recordEditorialDecision,
  type ApiInvitation,
  type ApiManuscript,
  type ApiReview,
  type ApiReviewer,
} from '../../lib/manuscripts'

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
  const [manuscript, setManuscript] = useState<ApiManuscript | null>(null)
  const [invitations, setInvitations] = useState<ApiInvitation[]>([])
  const [reviews, setReviews] = useState<ApiReview[]>([])
  const [reviewers, setReviewers] = useState<ApiReviewer[]>([])
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)

  const [reviewerId, setReviewerId] = useState('')
  const [deadlineDays, setDeadlineDays] = useState(21)
  const [decision, setDecision] =
    useState<ReviewRecommendation>('minor_revision')
  const [decisionLetter, setDecisionLetter] = useState('')
  const [revisionDays, setRevisionDays] = useState(21)
  const [checklist, setChecklist] = useState(checklistDefaults)
  const [screeningNotes, setScreeningNotes] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  async function reload() {
    if (!id) return
    const [detail, reviewerList] = await Promise.all([
      fetchManuscript(id),
      fetchReviewers(),
    ])
    setManuscript(detail.manuscript)
    setInvitations(detail.invitations ?? [])
    setReviews(detail.reviews ?? [])
    setReviewers(reviewerList)
  }

  useEffect(() => {
    if (!id) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        await reload()
      } catch (err) {
        if (!cancelled) {
          setManuscript(null)
          setError(err instanceof Error ? err.message : 'Manuscript not found.')
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
        <p className="text-ink-500">{error}</p>
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
  const canDecideStatus = ['under_review', 'revision_requested'].includes(
    manuscript.status,
  )
  const reviewCount = reviews.length
  const hasReviews = reviewCount > 0
  const openInviteCount = invitations.filter(
    (item) =>
      (item.status === 'sent' || item.status === 'accepted') && !item.review,
  ).length
  const canDecide = canDecideStatus && hasReviews
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

  async function handleScreening(action: 'pass' | 'formatting' | 'desk_reject') {
    if (!id) return
    if (action === 'pass' && !checklistComplete) {
      setError('Complete the screening checklist before passing.')
      return
    }
    if (action === 'formatting' && !screeningNotes.trim()) {
      setError('Add notes describing the formatting issues.')
      return
    }
    if (action === 'desk_reject' && !rejectReason.trim()) {
      setError('Provide a desk-reject reason for the author.')
      return
    }

    setPending(true)
    setError(null)
    try {
      const updated = await applyScreeningAction(id, {
        action,
        notes: screeningNotes.trim() || undefined,
        rejectReason:
          action === 'desk_reject' ? rejectReason.trim() : undefined,
      })
      setManuscript(updated)
      if (action === 'pass') {
        setToast('Screening passed — you can invite reviewers now.')
        setMessage(
          'Initial screening passed. Invite registered reviewers from the panel on the right.',
        )
      } else if (action === 'formatting') {
        setToast('Formatting revision requested.')
        setMessage('Author will upload corrected files from their dashboard.')
      } else {
        setToast('Manuscript desk-rejected.')
        setMessage('Desk reject recorded. The author can see the reason.')
      }
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Screening action failed.')
    } finally {
      setPending(false)
    }
  }

  async function handleInvite() {
    if (!id || !reviewerId) return
    const selected = availableReviewers.find((item) => item.id === reviewerId)
    if (!selected) {
      setError('Please choose a reviewer.')
      return
    }

    setPending(true)
    setError(null)
    try {
      const invitation = await inviteReviewer(id, {
        reviewerId: selected.id,
        deadlineDays,
      })
      setToast(`Invitation sent to ${invitation.reviewerName}.`)
      setMessage(
        `Invitation sent to ${invitation.reviewerName} (${invitation.reviewerEmail}). They will see it under Reviewer → Invitations when they sign in.`,
      )
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invite failed.')
    } finally {
      setPending(false)
    }
  }

  async function handleDecision() {
    if (!id) return
    if (!hasReviews) {
      setError(
        'Invite reviewers and wait for at least one review before recording a decision.',
      )
      return
    }
    if (selectedDecision === 'accept' && openInviteCount > 0) {
      setError(
        'Cannot accept while review invitations are still open.',
      )
      return
    }
    setPending(true)
    setError(null)
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
        setMessage(
          'Accepted — this paper is now in the Production queue for the production team.',
        )
      } else if (selectedDecision === 'reject') {
        setMessage('Rejected. The author will see this on their dashboard.')
      } else {
        setMessage(
          'Revision requested. The author will upload a revised manuscript from their account.',
        )
      }
      setToast('Decision saved.')
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Decision failed.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="page-stack animate-rise">
      {toast ? <Toast message={toast} tone="success" onClose={() => setToast(null)} /> : null}

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
          </>
        }
        badge={<StatusBadge status={manuscript.status} />}
      />

      {awaitingDecision ? (
        <div className="rounded-[var(--radius-lg)] border border-signal-100 bg-signal-50 px-4 py-3 text-sm text-signal-700">
          <p className="font-semibold">
            {reviewCount} review{reviewCount === 1 ? '' : 's'} received — decision needed
          </p>
          <p className="mt-1 text-ink-600">
            Record Accept to send it to Production, or request a revision / reject.
          </p>
        </div>
      ) : null}

      {manuscript.status === 'accepted' ||
      manuscript.status === 'in_production' ||
      manuscript.status === 'proof_sent' ||
      manuscript.status === 'ready_for_publication' ||
      manuscript.status === 'published' ? (
        <div className="rounded-[var(--radius-lg)] border border-signal-100 bg-signal-50 px-4 py-3 text-sm text-signal-700">
          <p className="font-semibold">
            {manuscript.status === 'accepted'
              ? 'Accepted — ready for production'
              : `Handed to production (${statusLabels[manuscript.status]})`}
          </p>
          <p className="mt-1 text-ink-600">
            Production staff will process this manuscript from their own queue.
          </p>
        </div>
      ) : null}

      {needsScreening ? (
        <div className="surface space-y-5 p-5 sm:p-6 ring-2 ring-signal-100">
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-ink-500 uppercase">
              Initial screening
            </h2>
            <p className="mt-2 text-sm text-ink-500">
              Check the paper, then pass it to invite reviewers — or request
              formatting fixes / desk reject.
            </p>
          </div>

          <ul className="space-y-3">
            {(
              [
                ['format', 'Format complies with journal guidelines'],
                ['scope', 'Topic is within journal scope'],
                ['ethics', 'Ethics / COI / funding statements present'],
                ['plagiarism', 'Plagiarism check recorded'],
              ] as const
            ).map(([key, label]) => (
              <li key={key}>
                <label className="flex cursor-pointer items-start gap-3 rounded-md border border-line bg-paper-soft px-3 py-3">
                  <input
                    type="checkbox"
                    checked={checklist[key]}
                    onChange={() => {
                      setChecklist((prev) => ({ ...prev, [key]: !prev[key] }))
                      setError(null)
                    }}
                    disabled={pending}
                    className="mt-0.5 accent-[var(--color-signal-600)]"
                  />
                  <span className="text-sm font-medium text-ink-800">{label}</span>
                </label>
              </li>
            ))}
          </ul>

          <div className="field">
            <label htmlFor="screeningNotes">Internal notes</label>
            <textarea
              id="screeningNotes"
              rows={3}
              value={screeningNotes}
              disabled={pending}
              onChange={(e) => {
                setScreeningNotes(e.target.value)
                setError(null)
              }}
              placeholder="Checklist findings, scope notes…"
              className="resize-y"
            />
          </div>

          <div className="field">
            <label htmlFor="rejectReason">Desk-reject reason</label>
            <textarea
              id="rejectReason"
              rows={2}
              value={rejectReason}
              disabled={pending}
              onChange={(e) => {
                setRejectReason(e.target.value)
                setError(null)
              }}
              placeholder="Shown to the author if desk rejected"
              className="resize-y"
            />
          </div>

          {error ? (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="rounded-md bg-signal-50 px-3 py-2 text-sm font-medium text-signal-700">
              {message}
            </p>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row">
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
              className="btn border-rose-600 bg-rose-50 text-rose-600 hover:bg-rose-50"
              disabled={pending}
              onClick={() => void handleScreening('desk_reject')}
            >
              Desk reject
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
        <div className="space-y-4">
          <div className="surface p-5 sm:p-6">
            <h2 className="text-sm font-semibold tracking-wide text-ink-500 uppercase">
              Status
            </h2>
            <p className="mt-2 text-lg font-semibold text-ink-800">
              {statusLabels[manuscript.status]}
            </p>
            {manuscript.decision && manuscript.decisionLetter ? (
              <div className="mt-3 rounded-md bg-paper px-3 py-2 text-sm text-ink-600">
                <p className="font-semibold text-ink-800">
                  Latest decision:{' '}
                  {recommendationLabels[
                    manuscript.decision as ReviewRecommendation
                  ] ?? manuscript.decision}
                </p>
                <p className="mt-1">{manuscript.decisionLetter}</p>
              </div>
            ) : needsScreening ? (
              <p className="mt-2 text-sm text-ink-500">
                Complete initial screening above. After pass, invite reviewers here.
              </p>
            ) : (
              <p className="mt-2 text-sm text-ink-500">
                Invite reviewers, wait for reports, then record an editorial decision.
              </p>
            )}
          </div>

          <div
            className={`surface p-5 sm:p-6 ${
              awaitingDecision ? 'ring-2 ring-signal-200' : ''
            }`}
          >
            <h2 className="text-sm font-semibold tracking-wide text-ink-500 uppercase">
              Record decision
            </h2>
            {!canDecideStatus ? (
              <p className="mt-3 text-sm text-ink-500">
                Decisions are available when the manuscript is under review.
              </p>
            ) : !hasReviews ? (
              <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
                Invite at least one reviewer and wait for their report before you
                can Accept, request revision, or Reject. Saving a decision without
                reviews is blocked.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {openInviteCount > 0 ? (
                  <p className="rounded-md bg-sky-50 px-3 py-2 text-sm text-sky-700">
                    {openInviteCount} review invitation
                    {openInviteCount === 1 ? ' is' : 's are'} still open. You can
                    request revision or reject, but Accept is available only after
                    all open invitations have a report.
                  </p>
                ) : null}
                <div className="field">
                  <label htmlFor="decision">Decision</label>
                  <select
                    id="decision"
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
                <div className="field">
                  <label htmlFor="decisionLetter">Decision letter</label>
                  <textarea
                    id="decisionLetter"
                    rows={5}
                    value={decisionLetter}
                    onChange={(e) => {
                      setDecisionLetter(e.target.value)
                      setError(null)
                    }}
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
                  {pending ? 'Saving…' : 'Save decision'}
                </button>
              </div>
            )}
          </div>

          {reviews.length > 0 ? (
            <ReviewReports reviews={reviews} title="Submitted reviews" />
          ) : (
            <div className="surface px-5 py-8 text-center sm:px-6">
              <p className="text-sm font-medium text-ink-600">
                No submitted reviews yet
              </p>
              <p className="mt-1 text-sm text-ink-400">
                Invite reviewers on the right. Their full reports will appear
                here.
              </p>
            </div>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="surface p-5 sm:p-6">
            <h2 className="text-sm font-semibold tracking-wide text-ink-500 uppercase">
              Invite reviewer
            </h2>
            <p className="mt-2 text-sm text-ink-500">
              Choose a registered reviewer and send an invite. They will see it
              when they sign in to their reviewer account.
            </p>

            {!canInvite ? (
              <p className="mt-4 rounded-md bg-paper px-3 py-2 text-sm text-ink-500">
                Invitations are available once the manuscript is under review.
              </p>
            ) : availableReviewers.length === 0 ? (
              <p className="mt-4 rounded-md bg-paper px-3 py-2 text-sm text-ink-500">
                All directory reviewers already have open invitations.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="field">
                  <label htmlFor="reviewer">Reviewer</label>
                  <select
                    id="reviewer"
                    value={reviewerId}
                    onChange={(e) => {
                      setReviewerId(e.target.value)
                      setError(null)
                      setMessage(null)
                    }}
                  >
                    {availableReviewers.map((reviewer) => (
                      <option key={reviewer.id} value={reviewer.id}>
                        {reviewer.name} (Reviewer)
                        {reviewer.expertise ? ` — ${reviewer.expertise}` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-ink-500">
                    Selected:{' '}
                    {availableReviewers.find((item) => item.id === reviewerId)
                      ?.name ?? '—'}
                  </p>
                </div>
                <div className="field">
                  <label htmlFor="deadline">Deadline (days)</label>
                  <select
                    id="deadline"
                    value={deadlineDays}
                    onChange={(e) => setDeadlineDays(Number(e.target.value))}
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
                  className="btn btn-signal w-full"
                  disabled={pending}
                  onClick={() => void handleInvite()}
                >
                  {pending ? 'Sending…' : 'Send invitation'}
                </button>
              </div>
            )}
          </div>

          <DataPanel
            title="Review invitations"
            count={invitations.length}
            size="md"
            scroll={invitations.length > 0}
          >
            {invitations.length === 0 ? (
              <p className="px-4 py-8 text-sm text-ink-500">
                No reviewers invited yet.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {invitations.map((item) => (
                  <li key={item.id} className="px-4 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink-800">
                          {item.reviewerName}
                        </p>
                        <p className="truncate text-xs text-ink-500">
                          {item.reviewerEmail}
                        </p>
                        <p className="mt-1 text-xs text-ink-300">
                          Due {item.deadline} · Round {item.round}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[0.7rem] font-semibold ${
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
                  </li>
                ))}
              </ul>
            )}
          </DataPanel>

          {error ? (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="rounded-md bg-signal-50 px-3 py-2 text-sm font-medium text-signal-700">
              {message}
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  )
}
