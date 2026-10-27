import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { StatusBadge } from '../components/StatusBadge'
import { DetailHeader } from '../components/ui'
import { useToast } from '../components/ToastProvider'
import { statusLabels } from '../data/mock'
import {
  downloadProof,
  fetchManuscript,
  respondToProof,
  type ApiManuscript,
} from '../lib/manuscripts'

export function ProofApprovalPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [manuscript, setManuscript] = useState<ApiManuscript | null>(null)
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [corrections, setCorrections] = useState('')
  const [mode, setMode] = useState<'choose' | 'corrections'>('choose')
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setLoadError(null)
      try {
        const detail = await fetchManuscript(id!)
        if (!cancelled) setManuscript(detail.manuscript)
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
        Loading proof…
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

  if (manuscript.status !== 'proof_sent') {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-16 text-center animate-rise">
        <h1 className="font-display text-3xl font-semibold text-ink-800">
          No proof waiting
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

  async function handleApprove() {
    if (!id) return
    setPending(true)
    try {
      await respondToProof(id, { action: 'approve' })
      toast.success('Proof approved.')
      navigate(`/author/submissions/${id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not approve proof.')
    } finally {
      setPending(false)
    }
  }

  async function handleCorrections(event: FormEvent) {
    event.preventDefault()
    if (!id) return
    setPending(true)
    try {
      await respondToProof(id, {
        action: 'corrections',
        corrections,
      })
      toast.success('Corrections sent to production.')
      navigate(`/author/submissions/${id}`)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not send corrections.',
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="page-stack mx-auto max-w-3xl animate-rise">
      <DetailHeader
        backTo={`/author/submissions/${manuscript.id}`}
        backLabel="← Back to manuscript"
        title="Proof approval"
        subtitle={
          <>
            <span>
              {manuscript.id}
              {manuscript.proofRound
                ? ` · Proof round ${manuscript.proofRound}`
                : ''}
            </span>
            <span className="mt-1 block font-semibold text-ink-800">
              {manuscript.title}
            </span>
          </>
        }
        badge={<StatusBadge status={manuscript.status} />}
      />

      <div className="surface p-5 sm:p-6">
        <h2 className="text-sm font-semibold tracking-wide text-ink-500 uppercase">
          Proof PDF
        </h2>
        <p className="mt-2 text-sm text-ink-700">
          {manuscript.proofFileName ?? 'Proof file.pdf'}
        </p>
        <p className="mt-2 text-sm text-ink-500">
          Download the production proof package, then approve or request
          corrections.
        </p>
        <button
          type="button"
          className="btn btn-ghost mt-4"
          disabled={downloading}
          onClick={() => {
            void (async () => {
              setDownloading(true)
              try {
                await downloadProof(
                  manuscript.id,
                  manuscript.proofFileName ?? 'proof.pdf',
                )
              } catch (err) {
                toast.error(
                  err instanceof Error
                    ? err.message
                    : 'Could not download proof.',
                )
              } finally {
                setDownloading(false)
              }
            })()
          }}
        >
          {downloading ? 'Downloading…' : 'Download proof'}
        </button>
      </div>

      {mode === 'choose' ? (
        <div className="surface space-y-4 p-5 sm:p-6">
          <p className="text-sm text-ink-500">
            Approve the proof to move toward publication, or request corrections
            for another production round.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              className="btn btn-signal"
              disabled={pending}
              onClick={() => void handleApprove()}
            >
              {pending ? 'Saving…' : 'Approve proof'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={pending}
              onClick={() => setMode('corrections')}
            >
              Request corrections
            </button>
          </div>
        </div>
      ) : (
        <form
          className="surface space-y-4 p-5 sm:p-6"
          onSubmit={(e) => void handleCorrections(e)}
        >
          <div className="field">
            <label htmlFor="corrections">Corrections needed</label>
            <textarea
              id="corrections"
              rows={5}
              value={corrections}
              onChange={(e) => setCorrections(e.target.value)}
              placeholder="List typos, layout issues, figure corrections…"
              className="resize-y"
              required
            />
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setMode('choose')}
            >
              Back
            </button>
            <button type="submit" className="btn btn-signal" disabled={pending}>
              {pending ? 'Sending…' : 'Send corrections'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
