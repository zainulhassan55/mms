import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { StatusBadge } from '../components/StatusBadge'
import { ReviewReports } from '../components/ReviewReports'
import { DetailHeader } from '../components/ui'
import { useToast } from '../components/ToastProvider'
import {
  recommendationLabels,
  statusLabels,
  type ReviewRecommendation,
} from '../data/mock'
import {
  fetchManuscript,
  submitRevision,
  type ApiManuscript,
  type ApiReview,
} from '../lib/manuscripts'

export function RevisionPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [manuscript, setManuscript] = useState<ApiManuscript | null>(null)
  const [reviews, setReviews] = useState<ApiReview[]>([])
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [responseLetter, setResponseLetter] = useState('')
  const [file, setFile] = useState<File | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setLoadError(null)
      try {
        const detail = await fetchManuscript(id!)
        if (!cancelled) {
          setManuscript(detail.manuscript)
          setReviews(detail.reviews ?? [])
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : 'Manuscript not found.'
          setManuscript(null)
          setLoadError(message)
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
        <p className="text-ink-500">{loadError}</p>
        <Link to="/author/dashboard" className="btn btn-signal">
          Back to dashboard
        </Link>
      </div>
    )
  }

  const canRevise = ['revision_requested', 'formatting_requested'].includes(
    manuscript.status,
  )

  if (!canRevise) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-16 text-center animate-rise">
        <h1 className="font-display text-3xl font-semibold text-ink-800">
          No revision required
        </h1>
        <p className="text-ink-500">
          Current status: {statusLabels[manuscript.status]}
        </p>
        <Link
          to={`/author/submissions/${manuscript.id}`}
          className="btn btn-signal"
        >
          Open manuscript
        </Link>
      </div>
    )
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!id || !manuscript) return
    if (!file) {
      toast.error('Please upload a revised manuscript file.')
      return
    }
    if (!responseLetter.trim()) {
      toast.error('Please include a response letter.')
      return
    }

    setPending(true)
    try {
      await submitRevision(id, {
        responseLetter: responseLetter.trim(),
        file,
      })
      toast.success('Revision submitted.')
      navigate(`/author/submissions/${id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not submit revision.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="page-stack mx-auto max-w-3xl animate-rise">
      <DetailHeader
        backTo={`/author/submissions/${manuscript.id}`}
        backLabel="← Back to manuscript"
        title={
          manuscript.status === 'formatting_requested'
            ? 'Upload corrected files'
            : 'Submit revision'
        }
        subtitle={`${manuscript.id} · Current version v${manuscript.version}`}
        badge={<StatusBadge status={manuscript.status} />}
      />

      {(manuscript.decisionLetter || manuscript.officeNotes) && (
        <div className="surface-quiet p-4 text-sm text-ink-700">
          <p className="text-xs font-semibold tracking-wide text-ink-300 uppercase">
            {manuscript.decision
              ? `Editor decision · ${
                  recommendationLabels[
                    manuscript.decision as ReviewRecommendation
                  ] ?? manuscript.decision
                }`
              : 'Editor notes'}
          </p>
          <p className="mt-2 whitespace-pre-wrap">
            {manuscript.decisionLetter ?? manuscript.officeNotes}
          </p>
          {manuscript.revisionDueAt ? (
            <p className="mt-2 text-xs font-medium text-amber-600">
              Response due {manuscript.revisionDueAt}
            </p>
          ) : null}
        </div>
      )}

      {reviews.length > 0 ? (
        <ReviewReports reviews={reviews} forAuthor title="Reviewer comments" />
      ) : null}

      <form
        className="surface space-y-5 p-5 sm:p-6"
        onSubmit={(e) => void handleSubmit(e)}
      >
        <div className="field">
          <label htmlFor="response">
            {manuscript.status === 'formatting_requested'
              ? 'Notes to the editor'
              : 'Response letter to reviewers'}
          </label>
          <textarea
            id="response"
            rows={7}
            value={responseLetter}
            onChange={(e) => setResponseLetter(e.target.value)}
            placeholder="Describe changes point-by-point…"
            className="resize-y"
            required
          />
        </div>

        <div className="surface-quiet p-4">
          <p className="text-sm font-semibold text-ink-800">Revised manuscript</p>
          <p className="mt-1 text-sm text-ink-500">
            Upload a PDF or Word file. The file is stored with this revision.
          </p>
          {file ? (
            <p className="mt-2 text-sm font-medium text-signal-700">{file.name}</p>
          ) : (
            <p className="mt-2 text-sm text-ink-300">No file selected</p>
          )}
          <label className="btn btn-ghost mt-3 cursor-pointer">
            Choose file
            <input
              type="file"
              className="sr-only"
              accept=".pdf,.doc,.docx,application/pdf"
              onChange={(e) => {
                const next = e.target.files?.[0]
                if (!next) return
                setFile(next)
                e.target.value = ''
              }}
            />
          </label>
        </div>

        {manuscript.status === 'revision_requested' ? (
          <p className="rounded-[var(--radius-md)] bg-paper-soft px-3.5 py-3 text-sm text-ink-600">
            After you submit, the revision goes to the <strong>Editor in Chief</strong> first.
            They will route it to an editor, who invites reviewers for the next round.
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-end">
          <Link
            to={`/author/submissions/${manuscript.id}`}
            className="btn btn-ghost"
          >
            Cancel
          </Link>
          <button type="submit" className="btn btn-signal" disabled={pending}>
            {pending
              ? 'Submitting…'
              : `Submit ${
                  manuscript.status === 'formatting_requested'
                    ? 'correction'
                    : 'revision'
                }`}
          </button>
        </div>
      </form>
    </div>
  )
}
