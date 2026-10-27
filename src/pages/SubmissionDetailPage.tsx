import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { StatusBadge } from '../components/StatusBadge'
import { ReviewReports } from '../components/ReviewReports'
import { DetailHeader } from '../components/ui'
import { useToast } from '../components/ToastProvider'
import { ManuscriptStageTracker } from '../components/workflow/ManuscriptStageTracker'
import { DiscussionsPanel } from '../components/workflow/DiscussionsPanel'
import { statusLabels } from '../data/mock'
import {
  activeWorkflowStageIndex,
  workflowStages,
} from '../lib/workflow'
import {
  downloadManuscriptFile,
  fetchManuscript,
  type ApiActivity,
  type ApiManuscript,
  type ApiReview,
} from '../lib/manuscripts'

export function SubmissionDetailPage() {
  const { id } = useParams()
  const toast = useToast()
  const [manuscript, setManuscript] = useState<ApiManuscript | null>(null)
  const [activity, setActivity] = useState<ApiActivity[]>([])
  const [reviews, setReviews] = useState<ApiReview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchManuscript(id!)
        if (!cancelled) {
          setManuscript(data.manuscript)
          setActivity(data.activity)
          setReviews(data.reviews ?? [])
        }
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
        <p className="text-ink-500">
          {error ?? 'This submission ID is not in your workspace.'}
        </p>
        <Link to="/author/dashboard" className="btn btn-signal">
          Back to dashboard
        </Link>
      </div>
    )
  }

  const showDecision =
    Boolean(manuscript.decisionLetter) &&
    ['revision_requested', 'rejected', 'accepted', 'copyediting'].includes(
      manuscript.status,
    )
  const stageIdx = Math.max(activeWorkflowStageIndex(manuscript.status), 0)
  const stageLabel =
    manuscript.status === 'rejected'
      ? 'Declined'
      : workflowStages[stageIdx]?.label ?? 'Submission'
  const needsAction = [
    'revision_requested',
    'formatting_requested',
    'proof_sent',
    'draft',
  ].includes(manuscript.status)

  return (
    <div className="page-stack mx-auto max-w-5xl animate-rise">
      <DetailHeader
        backTo="/author/dashboard"
        backLabel="← Back to dashboard"
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
            {manuscript.authors}
            {manuscript.section ? ` · ${manuscript.section.title}` : ''}
            {' · '}
            {manuscript.articleType} · v{manuscript.version}
          </>
        }
        badge={<StatusBadge status={manuscript.status} />}
      />

      {/* Progress hero */}
      <section
        className={`overflow-hidden rounded-[var(--radius-lg)] border ${
          needsAction
            ? 'border-amber-200 bg-gradient-to-b from-amber-50/90 to-paper'
            : 'border-line bg-gradient-to-b from-signal-50/40 to-paper'
        }`}
      >
        <div className="flex flex-col gap-4 px-5 pt-5 sm:flex-row sm:items-start sm:justify-between sm:px-6 sm:pt-6">
          <div>
            <p className="text-xs font-semibold tracking-wide text-ink-400 uppercase">
              Workflow progress
            </p>
            <p className="mt-1 font-display text-2xl font-semibold text-ink-800">
              {statusLabels[manuscript.status]}
            </p>
            <p className="mt-1 text-sm text-ink-500">
              Current stage:{' '}
              <span className="font-semibold text-signal-800">{stageLabel}</span>
              {' · '}
              {statusMessage(manuscript)}
            </p>
          </div>
          <div className="shrink-0">{actionButton(manuscript)}</div>
        </div>

        <div className="px-4 py-5 sm:px-8 sm:pb-6">
          <ManuscriptStageTracker status={manuscript.status} />
        </div>

        {showDecision ? (
          <div
            className={`border-t px-5 py-4 sm:px-6 ${
              manuscript.status === 'rejected'
                ? 'border-rose-100 bg-rose-50/80'
                : manuscript.status === 'accepted' ||
                    manuscript.status === 'copyediting'
                  ? 'border-signal-100 bg-signal-50/70'
                  : 'border-amber-100 bg-amber-50/70'
            }`}
          >
            <p className="text-sm font-semibold text-ink-800">
              Editor decision letter
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-ink-700">
              {manuscript.decisionLetter}
            </p>
            {manuscript.revisionDueAt ? (
              <p className="mt-2 text-xs font-medium text-ink-500">
                Response due {manuscript.revisionDueAt}
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      <div className="space-y-5">
        <section className="rounded-[var(--radius-lg)] border border-line bg-paper p-5 sm:p-6">
          <h2 className="text-xs font-semibold tracking-wide text-ink-400 uppercase">
            What happens next
          </h2>
          <div className="mt-3 space-y-3">
            <NextSteps manuscript={manuscript} />
          </div>
        </section>

        <section className="rounded-[var(--radius-lg)] border border-line bg-paper p-5 sm:p-6">
          <h2 className="text-xs font-semibold tracking-wide text-ink-400 uppercase">
            Manuscript details
          </h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <Meta label="Submitted" value={manuscript.submittedAt ?? '—'} />
            <Meta label="Last updated" value={manuscript.updatedAt} />
            <Meta label="Article type" value={manuscript.articleType} />
            {manuscript.section ? (
              <Meta label="Section" value={manuscript.section.title} />
            ) : null}
            <Meta label="Version" value={`v${manuscript.version}`} />
            {manuscript.assignedEditor ? (
              <Meta label="Assigned editor" value={manuscript.assignedEditor} />
            ) : (
              <Meta label="Assigned editor" value="Pending screening" />
            )}
            {manuscript.doi ? <Meta label="DOI" value={manuscript.doi} /> : null}
            {manuscript.volume || manuscript.issue ? (
              <Meta
                label="Issue"
                value={`Vol. ${manuscript.volume ?? '—'} No. ${manuscript.issue ?? '—'}`}
              />
            ) : null}
          </dl>
        </section>

        {reviews.length > 0 ? (
          <ReviewReports
            reviews={reviews}
            forAuthor
            title="Reviewer comments"
          />
        ) : null}

        {manuscript.abstract ? (
          <section className="rounded-[var(--radius-lg)] border border-line bg-paper px-5 py-5 sm:px-6">
            <h2 className="text-xs font-semibold tracking-wide text-ink-400 uppercase">
              Abstract
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-700">
              {manuscript.abstract}
            </p>
            {manuscript.keywords ? (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                {manuscript.keywords.split(',').map((kw) => {
                  const label = kw.trim()
                  if (!label) return null
                  return (
                    <span
                      key={label}
                      className="rounded-md bg-paper-soft px-2.5 py-1 text-xs font-medium text-ink-600 ring-1 ring-line"
                    >
                      {label}
                    </span>
                  )
                })}
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="rounded-[var(--radius-lg)] border border-line bg-paper">
          <div className="flex items-center justify-between border-b border-line px-5 py-3 sm:px-6">
            <h2 className="text-xs font-semibold tracking-wide text-ink-400 uppercase">
              Submission files
            </h2>
            <span className="text-xs font-medium text-ink-400">
              {manuscript.files?.length ?? 0}
            </span>
          </div>
          {!manuscript.files || manuscript.files.length === 0 ? (
            <p className="px-5 py-8 text-sm text-ink-500 sm:px-6">
              No files uploaded.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {manuscript.files.map((file) => (
                <li
                  key={file.id}
                  className="flex items-center justify-between gap-3 px-5 py-3 text-sm sm:px-6"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink-800">
                      {file.fileName}
                    </p>
                    <p className="text-xs text-ink-400 capitalize">
                      {file.kind.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost shrink-0 cursor-pointer"
                    onClick={() => {
                      void downloadManuscriptFile(
                        manuscript.id,
                        file.id,
                        file.fileName,
                      ).catch((err) => {
                        toast.error(
                          err instanceof Error
                            ? err.message
                            : 'Download failed.',
                        )
                      })
                    }}
                  >
                    Download
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-[var(--radius-lg)] border border-line bg-paper">
          <div className="border-b border-line px-5 py-3 sm:px-6">
            <h2 className="text-xs font-semibold tracking-wide text-ink-400 uppercase">
              History for this paper
            </h2>
          </div>
          {activity.length === 0 ? (
            <p className="px-5 py-8 text-sm text-ink-500 sm:px-6">
              No activity yet.
            </p>
          ) : (
            <ol className="space-y-0 px-5 py-2 sm:px-6">
              {activity.map((item, index) => (
                <li
                  key={item.id}
                  className="relative flex gap-3 border-b border-line py-3 last:border-0"
                >
                  <span
                    className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                      index === 0
                        ? 'bg-signal-600 ring-4 ring-signal-100'
                        : 'bg-ink-300'
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink-800">
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-sm text-ink-500">{item.detail}</p>
                    <p className="mt-1 text-xs text-ink-300">{item.at}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

      </div>

      <DiscussionsPanel manuscriptId={manuscript.id} />
    </div>
  )
}

function actionButton(manuscript: ApiManuscript) {
  if (manuscript.status === 'revision_requested') {
    return (
      <Link
        to={`/author/submissions/${manuscript.id}/revise`}
        className="btn btn-signal"
      >
        Upload revision
      </Link>
    )
  }
  if (manuscript.status === 'formatting_requested') {
    return (
      <Link
        to={`/author/submissions/${manuscript.id}/revise`}
        className="btn btn-signal"
      >
        Upload corrected files
      </Link>
    )
  }
  if (manuscript.status === 'proof_sent') {
    return (
      <Link
        to={`/author/submissions/${manuscript.id}/proof`}
        className="btn btn-signal"
      >
        Review proof
      </Link>
    )
  }
  return null
}

function NextSteps({ manuscript }: { manuscript: ApiManuscript }) {
  switch (manuscript.status) {
    case 'revision_submitted':
      return (
        <div className="rounded-[var(--radius-md)] border border-violet-100 bg-violet-50/70 px-4 py-3 text-sm text-violet-900">
          <p className="font-semibold">Revision received by the Editor in Chief</p>
          <p className="mt-1 text-ink-600">
            Your revised manuscript is with the editorial office. The Editor in
            Chief will route it for the next review round. Reviewer reports stay
            internal until a new final decision is issued.
          </p>
        </div>
      )
    case 'revision_requested':
      return (
        <>
          <p className="text-sm text-ink-600">
            Address the editor letter and reviewer comments, then upload your
            revision.
          </p>
          <Link
            to={`/author/submissions/${manuscript.id}/revise`}
            className="btn btn-signal w-full"
          >
            Upload revision
          </Link>
        </>
      )
    case 'formatting_requested':
      return (
        <>
          <p className="text-sm text-ink-600">
            Fix the formatting issues noted by the editor, then re-upload.
          </p>
          <Link
            to={`/author/submissions/${manuscript.id}/revise`}
            className="btn btn-signal w-full"
          >
            Upload corrected files
          </Link>
        </>
      )
    case 'proof_sent':
      return (
        <>
          <p className="text-sm text-ink-600">
            A production proof is ready. Review it and approve or request
            corrections.
          </p>
          <Link
            to={`/author/submissions/${manuscript.id}/proof`}
            className="btn btn-signal w-full"
          >
            Review proof
          </Link>
        </>
      )
    case 'draft':
      return (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Draft saved. Complete any missing fields and submit when ready.
        </p>
      )
    case 'submitted':
      return (
        <ol className="list-decimal space-y-2 pl-4 text-sm text-ink-600">
          <li>Editorial office screens scope, format, and ethics.</li>
          <li>If it passes, an editor invites peer reviewers.</li>
          <li>You will be notified when a decision is ready — no action now.</li>
        </ol>
      )
    case 'under_review':
      return (
        <p className="rounded-md bg-violet-50 px-3 py-2 text-sm text-violet-800">
          Peer review is underway. You will be notified when a decision is ready.
        </p>
      )
    case 'accepted':
    case 'copyediting':
    case 'in_production':
      return (
        <p className="rounded-md bg-signal-50 px-3 py-2 text-sm text-signal-800">
          Accepted — copyediting and production are preparing your article. A
          proof will follow.
        </p>
      )
    case 'ready_for_publication':
    case 'published':
      return (
        <p className="rounded-md bg-signal-50 px-3 py-2 text-sm text-signal-800">
          {manuscript.doi
            ? `Published · DOI ${manuscript.doi}`
            : 'Publication is complete or nearly complete.'}
        </p>
      )
    case 'rejected':
      return (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          This manuscript was declined. Review the decision letter and comments.
        </p>
      )
    default:
      return (
        <p className="text-sm text-ink-500">
          Track progress on the stage tracker as editorial and production steps
          complete.
        </p>
      )
  }
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.65rem] font-semibold tracking-wide text-ink-300 uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-ink-800">{value}</dd>
    </div>
  )
}

function statusMessage(manuscript: ApiManuscript) {
  switch (manuscript.status) {
    case 'submitted':
      return 'Awaiting initial screening by the editorial office.'
    case 'formatting_requested':
      return 'Formatting changes requested before peer review.'
    case 'revision_requested':
      return 'Revision requested — your response is needed.'
    case 'revision_submitted':
      return 'Revision received — with the Editor in Chief for routing.'
    case 'under_review':
      return 'Under peer review. Reviewer comments are released only with the Editor in Chief’s final decision.'
    case 'accepted':
    case 'copyediting':
      return 'Accepted and in copyediting before production.'
    case 'in_production':
      return 'In production — a proof will be sent when ready.'
    case 'proof_sent':
      return 'Proof ready for your review.'
    case 'ready_for_publication':
      return 'Proof approved — publication in progress.'
    case 'published':
      return manuscript.doi
        ? `Published · DOI ${manuscript.doi}`
        : 'Your article has been published.'
    case 'rejected':
      return 'This submission left the workflow after a decline decision.'
    case 'draft':
      return 'Saved as draft — submit when ready.'
    case 'under_review':
      return manuscript.assignedEditor
        ? `With ${manuscript.assignedEditor} for peer review.`
        : 'Under peer review.'
    default:
      return 'Track progress here as stages complete.'
  }
}
