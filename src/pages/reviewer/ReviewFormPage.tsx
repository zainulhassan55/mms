import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  recommendationLabels,
  type ReviewRecommendation,
} from '../../data/mock'
import { DetailHeader } from '../../components/ui'
import {
  fetchInvitation,
  submitReviewReport,
  type ApiInvitation,
} from '../../lib/manuscripts'

const recommendations: ReviewRecommendation[] = [
  'accept',
  'minor_revision',
  'major_revision',
  'reject',
]

export function ReviewFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [invitation, setInvitation] = useState<ApiInvitation | null>(null)
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [summary, setSummary] = useState('')
  const [strengths, setStrengths] = useState('')
  const [weaknesses, setWeaknesses] = useState('')
  const [commentsToAuthor, setCommentsToAuthor] = useState('')
  const [commentsToEditor, setCommentsToEditor] = useState('')
  const [recommendation, setRecommendation] =
    useState<ReviewRecommendation>('minor_revision')
  const [originality, setOriginality] = useState(3)
  const [methodology, setMethodology] = useState(3)
  const [clarity, setClarity] = useState(3)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setLoadError(null)
      try {
        const item = await fetchInvitation(id!)
        if (!cancelled) setInvitation(item)
      } catch (err) {
        if (!cancelled) {
          setInvitation(null)
          setLoadError(
            err instanceof Error ? err.message : 'Invitation not found.',
          )
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
      <div className="mx-auto max-w-lg space-y-4 py-16 text-center animate-rise">
        <p className="text-ink-500">Loading review…</p>
      </div>
    )
  }

  const owned =
    invitation &&
    invitation.status === 'accepted' &&
    !invitation.review

  if (!invitation || loadError || !owned) {
    const alreadySubmitted = Boolean(invitation?.review)
    return (
      <div className="mx-auto max-w-lg space-y-4 py-16 text-center animate-rise">
        <h1 className="font-display text-3xl font-semibold text-ink-800">
          {alreadySubmitted ? 'Review already submitted' : 'Review not available'}
        </h1>
        <p className="text-ink-500">
          {alreadySubmitted
            ? 'This invitation already has a submitted report.'
            : loadError ??
              'Accept the invitation first, then open it from Active reviews.'}
        </p>
        <Link
          to={alreadySubmitted ? '/reviewer/history' : '/reviewer/invitations'}
          className="btn btn-signal"
        >
          {alreadySubmitted ? 'View history' : 'Back to invitations'}
        </Link>
      </div>
    )
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (
      !summary.trim() ||
      !strengths.trim() ||
      !weaknesses.trim() ||
      !commentsToAuthor.trim()
    ) {
      setError('Please complete all required review fields.')
      return
    }

    setPending(true)
    setError(null)
    try {
      await submitReviewReport(invitation!.id, {
        summary: summary.trim(),
        strengths: strengths.trim(),
        weaknesses: weaknesses.trim(),
        commentsToAuthor: commentsToAuthor.trim(),
        commentsToEditor: commentsToEditor.trim(),
        recommendation,
        originality,
        methodology,
        clarity,
      })
      navigate('/reviewer/history')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit review.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="page-stack mx-auto max-w-3xl animate-rise">
      <DetailHeader
        backTo="/reviewer/active"
        backLabel="← Back to active reviews"
        title="Review form"
        subtitle={
          <>
            <span>
              {invitation.manuscriptId} · Due {invitation.deadline}
            </span>
            <span className="mt-1 block font-semibold text-ink-800">
              {invitation.manuscriptTitle ?? 'Manuscript review'}
            </span>
            <span className="mt-1 block">
              Blind review: author identity is hidden in this view.
            </span>
          </>
        }
      />

      <form className="surface space-y-5 p-5 sm:p-6" onSubmit={(e) => void handleSubmit(e)}>
        <div className="field">
          <label htmlFor="summary">Summary of the paper</label>
          <textarea
            id="summary"
            rows={4}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="resize-y"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="strengths">Strengths</label>
          <textarea
            id="strengths"
            rows={3}
            value={strengths}
            onChange={(e) => setStrengths(e.target.value)}
            className="resize-y"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="weaknesses">Weaknesses</label>
          <textarea
            id="weaknesses"
            rows={3}
            value={weaknesses}
            onChange={(e) => setWeaknesses(e.target.value)}
            className="resize-y"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="toAuthor">Comments to author</label>
          <textarea
            id="toAuthor"
            rows={4}
            value={commentsToAuthor}
            onChange={(e) => setCommentsToAuthor(e.target.value)}
            className="resize-y"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="toEditor">Comments to editor (confidential)</label>
          <textarea
            id="toEditor"
            rows={3}
            value={commentsToEditor}
            onChange={(e) => setCommentsToEditor(e.target.value)}
            className="resize-y"
          />
        </div>

        <div className="field">
          <label htmlFor="recommendation">Recommendation</label>
          <select
            id="recommendation"
            value={recommendation}
            onChange={(e) =>
              setRecommendation(e.target.value as ReviewRecommendation)
            }
          >
            {recommendations.map((item) => (
              <option key={item} value={item}>
                {recommendationLabels[item]}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <ScoreField
            id="originality"
            label="Originality"
            value={originality}
            onChange={setOriginality}
          />
          <ScoreField
            id="methodology"
            label="Methodology"
            value={methodology}
            onChange={setMethodology}
          />
          <ScoreField
            id="clarity"
            label="Clarity"
            value={clarity}
            onChange={setClarity}
          />
        </div>

        {error ? (
          <p className="rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-end">
          <Link to="/reviewer/active" className="btn btn-ghost">
            Cancel
          </Link>
          <button type="submit" className="btn btn-signal" disabled={pending}>
            {pending ? 'Submitting…' : 'Submit review'}
          </button>
        </div>
      </form>
    </div>
  )
}

function ScoreField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label} (1–5)</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {[1, 2, 3, 4, 5].map((score) => (
          <option key={score} value={score}>
            {score}
          </option>
        ))}
      </select>
    </div>
  )
}
