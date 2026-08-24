import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { StatusBadge } from '../components/StatusBadge'
import { ReviewReports } from '../components/ReviewReports'
import { DataPanel, DetailHeader } from '../components/ui'
import { statusLabels } from '../data/mock'
import {
  downloadManuscriptFile,
  fetchManuscript,
  type ApiActivity,
  type ApiManuscript,
  type ApiReview,
} from '../lib/manuscripts'

export function SubmissionDetailPage() {
  const { id } = useParams()
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
  }, [id])

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
    ['revision_requested', 'rejected', 'accepted'].includes(manuscript.status)

  return (
    <div className="page-stack animate-rise">
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
            {manuscript.authors} · {manuscript.articleType} · Version{' '}
            {manuscript.version}
          </>
        }
        badge={<StatusBadge status={manuscript.status} />}
      />

      <div className="author-detail-layout">
        <div className="author-detail-main space-y-4">
          <section className="surface space-y-3 p-5 sm:p-6">
            <h2 className="text-sm font-semibold tracking-wide text-ink-500 uppercase">
              Current status
            </h2>
            <p className="text-lg font-semibold text-ink-800">
              {statusLabels[manuscript.status]}
            </p>
            <p className="text-sm leading-relaxed text-ink-500">
              {statusMessage(manuscript)}
            </p>

            {showDecision ? (
              <div
                className={`rounded-[0.85rem] px-3.5 py-3 text-sm ${
                  manuscript.status === 'rejected'
                    ? 'bg-rose-50 text-rose-700'
                    : manuscript.status === 'accepted'
                      ? 'bg-signal-50 text-signal-700'
                      : 'bg-amber-50 text-amber-800'
                }`}
              >
                <p className="font-semibold">Editor decision letter</p>
                <p className="mt-1 whitespace-pre-wrap text-ink-700">
                  {manuscript.decisionLetter}
                </p>
                {manuscript.revisionDueAt ? (
                  <p className="mt-2 text-xs font-medium">
                    Response due {manuscript.revisionDueAt}
                  </p>
                ) : null}
              </div>
            ) : null}
          </section>

          {reviews.length > 0 ? (
            <ReviewReports
              reviews={reviews}
              forAuthor
              title="Reviewer comments"
            />
          ) : null}

          {manuscript.abstract ? (
            <section className="surface p-5 sm:p-6">
              <h2 className="text-sm font-semibold tracking-wide text-ink-500 uppercase">
                Abstract
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-600">
                {manuscript.abstract}
              </p>
            </section>
          ) : null}

          <DataPanel
            title="Files"
            count={manuscript.files?.length ?? 0}
            size="sm"
            scroll={(manuscript.files?.length ?? 0) > 0}
          >
            {!manuscript.files || manuscript.files.length === 0 ? (
              <p className="px-4 py-8 text-sm text-ink-500">No files uploaded.</p>
            ) : (
              <ul className="divide-y divide-line">
                {manuscript.files.map((file) => (
                  <li
                    key={file.id}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink-800">
                        {file.fileName}
                      </p>
                      <p className="text-xs text-ink-400">{file.kind}</p>
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
                          setError(
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
          </DataPanel>

          <DataPanel
            title="Activity"
            count={activity.length}
            size="md"
            scroll={activity.length > 0}
          >
            {activity.length === 0 ? (
              <p className="px-4 py-8 text-sm text-ink-500">No activity yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {activity.map((item) => (
                  <li key={item.id} className="px-4 py-3 text-sm">
                    <p className="font-semibold text-ink-800">{item.label}</p>
                    <p className="mt-0.5 text-ink-500">{item.detail}</p>
                    <p className="mt-1 text-xs text-ink-300">{item.at}</p>
                  </li>
                ))}
              </ul>
            )}
          </DataPanel>
        </div>

        <aside className="author-detail-side space-y-4">
          <section className="surface p-5 sm:p-6">
            <h2 className="text-sm font-semibold tracking-wide text-ink-500 uppercase">
              Next steps
            </h2>
            <div className="mt-3 space-y-3">
              <NextSteps manuscript={manuscript} />
            </div>
          </section>

          <section className="surface p-5 sm:p-6">
            <h2 className="text-sm font-semibold tracking-wide text-ink-500 uppercase">
              Manuscript details
            </h2>
            <dl className="mt-4 space-y-3">
              <Meta label="Submitted" value={manuscript.submittedAt ?? '—'} />
              <Meta label="Last updated" value={manuscript.updatedAt} />
              <Meta label="Article type" value={manuscript.articleType} />
              <Meta label="Version" value={`v${manuscript.version}`} />
              {manuscript.assignedEditor ? (
                <Meta label="Editor" value={manuscript.assignedEditor} />
              ) : null}
              {manuscript.doi ? <Meta label="DOI" value={manuscript.doi} /> : null}
              {manuscript.keywords ? (
                <Meta label="Keywords" value={manuscript.keywords} />
              ) : null}
            </dl>
          </section>

          {error ? (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">
              {error}
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  )
}

function NextSteps({ manuscript }: { manuscript: ApiManuscript }) {
  switch (manuscript.status) {
    case 'revision_requested':
      return (
        <>
          <p className="text-sm text-ink-500">
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
          <p className="text-sm text-ink-500">
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
          <p className="text-sm text-ink-500">
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
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Draft saved. Complete any missing fields and submit when ready.
        </p>
      )
    case 'submitted':
      return (
        <p className="rounded-md bg-sky-50 px-3 py-2 text-sm text-sky-700">
          No action needed — editorial screening is in progress.
        </p>
      )
    case 'under_review':
      return (
        <p className="rounded-md bg-violet-50 px-3 py-2 text-sm text-violet-700">
          Peer review is underway. You will be notified when a decision is
          ready.
        </p>
      )
    case 'accepted':
    case 'in_production':
      return (
        <p className="rounded-md bg-signal-50 px-3 py-2 text-sm text-signal-700">
          Accepted — production will prepare your article and send a proof.
        </p>
      )
    case 'ready_for_publication':
    case 'published':
      return (
        <p className="rounded-md bg-signal-50 px-3 py-2 text-sm text-signal-700">
          {manuscript.doi
            ? `Published · DOI ${manuscript.doi}`
            : 'Publication is complete or nearly complete.'}
        </p>
      )
    case 'rejected':
      return (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          This manuscript was rejected. Review the decision letter and comments
          on the left.
        </p>
      )
    default:
      return (
        <p className="text-sm text-ink-500">
          Track progress here as editorial and production steps complete.
        </p>
      )
  }
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-wide text-ink-300 uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-ink-800">{value}</dd>
    </div>
  )
}

function statusMessage(manuscript: ApiManuscript) {
  switch (manuscript.status) {
    case 'submitted':
      return 'Your manuscript is awaiting initial screening by the editor.'
    case 'formatting_requested':
      return 'The editor requested formatting changes before peer review can begin.'
    case 'revision_requested':
      return (
        manuscript.decisionLetter ??
        'The editor requested a revision. Please upload your response and revised files.'
      )
    case 'accepted':
      return 'Congratulations — your manuscript has been accepted and will move to production next.'
    case 'in_production':
      return 'Production is preparing your article. A proof will be sent when ready.'
    case 'proof_sent':
      return 'A production proof is ready for your review and approval.'
    case 'ready_for_publication':
      return 'You approved the proof. Publication and DOI assignment are in progress.'
    case 'published':
      return manuscript.doi
        ? `Published · DOI ${manuscript.doi}`
        : 'Your article has been published.'
    case 'rejected':
      return (
        manuscript.rejectReason ??
        manuscript.decisionLetter ??
        'This manuscript was rejected.'
      )
    case 'draft':
      return 'This draft is saved in your workspace. Complete and submit when ready.'
    case 'under_review':
      return manuscript.assignedEditor
        ? `Currently with ${manuscript.assignedEditor} for peer review.`
        : 'Your manuscript is under peer review.'
    default:
      return 'Track progress here as editorial and production steps complete.'
  }
}
