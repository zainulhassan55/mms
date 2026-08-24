import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { StatusBadge } from '../../components/StatusBadge'
import { Toast } from '../../components/Toast'
import { DetailHeader } from '../../components/ui'
import { statusLabels } from '../../data/mock'
import {
  fetchManuscript,
  publishManuscript,
  retryPortalSync,
  sendProof,
  startProduction,
  type ApiManuscript,
} from '../../lib/manuscripts'

export function ProductionManuscriptPage() {
  const { id } = useParams()
  const [manuscript, setManuscript] = useState<ApiManuscript | null>(null)
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)

  const [notes, setNotes] = useState('')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [doi, setDoi] = useState('')
  const [volume, setVolume] = useState('')
  const [issue, setIssue] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  async function reload() {
    if (!id) return
    const detail = await fetchManuscript(id)
    setManuscript(detail.manuscript)
    setDoi(detail.manuscript.doi ?? '')
    setVolume(detail.manuscript.volume ?? '')
    setIssue(detail.manuscript.issue ?? '')
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
        <Link to="/production/queue" className="btn btn-signal">
          Back to production queue
        </Link>
      </div>
    )
  }

  async function runAction(fn: () => Promise<void>, okMessage: string) {
    setPending(true)
    setError(null)
    setMessage(null)
    try {
      await fn()
      setMessage(okMessage)
      setToast(okMessage)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="page-stack animate-rise">
      {toast ? <Toast message={toast} onClose={() => setToast(null)} /> : null}

      <DetailHeader
        backTo="/production/queue"
        backLabel="← Back to production queue"
        meta={
          <>
            {manuscript.id} · v{manuscript.version}
            {manuscript.doi ? ` · ${manuscript.doi}` : ''}
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

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.95fr]">
        <div className="space-y-4">
          <div className="surface p-5 sm:p-6">
            <h2 className="text-sm font-semibold tracking-wide text-ink-500 uppercase">
              Current stage
            </h2>
            <p className="mt-2 text-lg font-semibold text-ink-800">
              {statusLabels[manuscript.status]}
            </p>
            {manuscript.productionNotes ? (
              <p className="mt-3 rounded-md bg-paper px-3 py-2 text-sm text-ink-600">
                {manuscript.productionNotes}
              </p>
            ) : null}
            {manuscript.proofFileName ? (
              <p className="mt-3 text-sm text-ink-500">
                Latest proof: {manuscript.proofFileName}
                {manuscript.proofRound ? ` (round ${manuscript.proofRound})` : ''}
              </p>
            ) : null}
            {manuscript.proofCorrections ? (
              <div className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-600">
                <p className="font-semibold">Author corrections requested</p>
                <p className="mt-1 text-ink-700">{manuscript.proofCorrections}</p>
              </div>
            ) : null}
          </div>

          <div className="surface p-5 sm:p-6">
            <h2 className="text-sm font-semibold tracking-wide text-ink-500 uppercase">
              Production checklist (MVP)
            </h2>
            <ol className="mt-3 space-y-2 text-sm text-ink-600">
              <li>1. Start production from accepted manuscript</li>
              <li>2. Complete copyediting / typesetting (manual)</li>
              <li>3. Upload proof PDF and send to author</li>
              <li>4. Wait for author approval</li>
              <li>5. Enter DOI and mark published</li>
            </ol>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="surface space-y-4 p-5 sm:p-6">
            <h2 className="text-sm font-semibold tracking-wide text-ink-500 uppercase">
              Actions
            </h2>

            <div className="field">
              <label htmlFor="notes">Production notes</label>
              <textarea
                id="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal notes for this stage…"
                className="resize-y"
              />
            </div>

            {manuscript.status === 'accepted' ? (
              <button
                type="button"
                className="btn btn-signal w-full"
                disabled={pending}
                onClick={() =>
                  void runAction(
                    () => startProduction(manuscript.id, notes).then(() => undefined),
                    'Production started.',
                  )
                }
              >
                {pending ? 'Working…' : 'Start production'}
              </button>
            ) : null}

            {['in_production', 'ready_for_publication', 'proof_sent'].includes(
              manuscript.status,
            ) ? (
              <div className="space-y-3">
                <div className="surface-quiet p-3">
                  <p className="text-sm font-semibold text-ink-800">Proof PDF</p>
                  <p className="mt-1 text-xs text-ink-500">
                    {proofFile?.name ?? 'No file selected'}
                  </p>
                  <label className="btn btn-ghost mt-2 cursor-pointer">
                    Choose proof
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        setProofFile(file)
                        e.target.value = ''
                      }}
                    />
                  </label>
                </div>
                <button
                  type="button"
                  className="btn btn-signal w-full"
                  disabled={pending}
                  onClick={() => {
                    if (!proofFile) {
                      setError('Please choose a proof PDF first.')
                      return
                    }
                    void runAction(async () => {
                      await sendProof(manuscript.id, {
                        fileName: proofFile.name,
                        notes,
                        file: proofFile,
                      })
                      setProofFile(null)
                    }, 'Proof sent to author.')
                  }}
                >
                  {pending
                    ? 'Sending…'
                    : manuscript.status === 'proof_sent'
                      ? 'Re-send proof to author'
                      : 'Send proof to author'}
                </button>
              </div>
            ) : null}

            {manuscript.status === 'proof_sent' ? (
              <p className="rounded-md bg-sky-50 px-3 py-2 text-sm text-sky-700">
                Waiting for the author to download and approve the proof, or
                re-send a new PDF above.
              </p>
            ) : null}

            {manuscript.status === 'ready_for_publication' ? (
              <div className="space-y-3 border-t border-line pt-4">
                <div className="field">
                  <label htmlFor="doi">DOI (manual)</label>
                  <input
                    id="doi"
                    value={doi}
                    onChange={(e) => setDoi(e.target.value)}
                    placeholder="10.xxxx/example.2026.001"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="field">
                    <label htmlFor="volume">Volume</label>
                    <input
                      id="volume"
                      value={volume}
                      onChange={(e) => setVolume(e.target.value)}
                      placeholder="3"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="issue">Issue</label>
                    <input
                      id="issue"
                      value={issue}
                      onChange={(e) => setIssue(e.target.value)}
                      placeholder="2"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-primary w-full"
                  disabled={pending}
                  onClick={() =>
                    void runAction(
                      () =>
                        publishManuscript(manuscript.id, {
                          doi,
                          volume,
                          issue,
                        }).then(() => undefined),
                      `Published with DOI ${doi.trim()}. Portal sync completed.`,
                    )
                  }
                >
                  {pending ? 'Publishing…' : 'Publish & sync to Portal'}
                </button>
              </div>
            ) : null}

            {manuscript.status === 'published' ? (
              <div className="space-y-3">
                <p className="rounded-md bg-signal-50 px-3 py-2 text-sm font-medium text-signal-700">
                  Published{manuscript.doi ? ` · ${manuscript.doi}` : ''}
                  {manuscript.portalSyncStatus
                    ? ` · Portal ${manuscript.portalSyncStatus}`
                    : ''}
                </p>
                <button
                  type="button"
                  className="btn btn-ghost w-full"
                  disabled={pending}
                  onClick={() =>
                    void runAction(
                      () =>
                        retryPortalSync(manuscript.id).then(() => undefined),
                      'Portal re-sync completed.',
                    )
                  }
                >
                  Re-sync to Portal
                </button>
              </div>
            ) : null}

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
          </div>
        </aside>
      </div>
    </div>
  )
}
