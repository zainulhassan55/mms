import { useEffect, useState } from 'react'
import { useToast } from '../ToastProvider'
import {
  createGalley,
  fetchDoiDeposits,
  fetchGalleys,
  fetchJournalIssues,
  queueDoiDeposit,
  scheduleIntoIssue,
  type DoiDeposit,
  type Galley,
  type JournalIssue,
} from '../../lib/workflow'

export function ProductionAssetsPanel({
  manuscriptId,
  journalId,
  currentDoi,
  onChanged,
}: {
  manuscriptId: string
  journalId?: string
  currentDoi?: string
  onChanged?: () => void
}) {
  const toast = useToast()
  const [galleys, setGalleys] = useState<Galley[]>([])
  const [issues, setIssues] = useState<JournalIssue[]>([])
  const [deposits, setDeposits] = useState<DoiDeposit[]>([])
  const [label, setLabel] = useState('PDF')
  const [format, setFormat] = useState('pdf')
  const [fileName, setFileName] = useState('')
  const [issueId, setIssueId] = useState('')
  const [doi, setDoi] = useState(currentDoi ?? '')
  const [pending, setPending] = useState(false)

  async function reload() {
    const [g, d] = await Promise.all([
      fetchGalleys(manuscriptId),
      fetchDoiDeposits(manuscriptId),
    ])
    setGalleys(g)
    setDeposits(d)
    if (journalId) {
      const iss = await fetchJournalIssues(journalId).catch(() => [])
      setIssues(iss.filter((i) => i.status !== 'published'))
      if (iss[0] && !issueId) setIssueId(iss.find((i) => i.status !== 'published')?.id ?? '')
    }
  }

  useEffect(() => {
    setDoi(currentDoi ?? '')
  }, [currentDoi])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        await reload()
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : 'Failed to load assets')
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manuscriptId, journalId, toast])

  async function handleGalley() {
    if (!fileName.trim()) {
      toast.error('Enter a galley file name (e.g. article.pdf).')
      return
    }
    setPending(true)
    try {
      await createGalley(manuscriptId, {
        label: label.trim() || 'PDF',
        format,
        fileName: fileName.trim(),
        isPrimary: format === 'pdf',
      })
      setFileName('')
      toast.success('Galley recorded.')
      await reload()
      onChanged?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Galley upload failed')
    } finally {
      setPending(false)
    }
  }

  async function handleSchedule() {
    if (!issueId) {
      toast.error('Select an issue first (create one in Journal settings).')
      return
    }
    setPending(true)
    try {
      await scheduleIntoIssue(issueId, manuscriptId)
      toast.success('Article scheduled into issue.')
      await reload()
      onChanged?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not schedule')
    } finally {
      setPending(false)
    }
  }

  async function handleDeposit() {
    setPending(true)
    try {
      const deposit = await queueDoiDeposit(manuscriptId, doi || undefined)
      toast.success(`DOI deposit ${deposit.status}: ${deposit.doi}`)
      await reload()
      onChanged?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'DOI deposit failed')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="surface space-y-4 p-5 sm:p-6">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-ink-500 uppercase">
            Galleys
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            Record PDF (required) and optional HTML/XML galleys for publication.
          </p>
        </div>
        <ul className="space-y-2">
          {galleys.map((g) => (
            <li
              key={g.id}
              className="flex items-center justify-between gap-2 rounded-md border border-line bg-paper-soft px-3 py-2 text-sm"
            >
              <span className="font-medium text-ink-800">
                {g.label}
                <span className="font-normal text-ink-400">
                  {' '}
                  · {g.format.toUpperCase()} · {g.fileName}
                </span>
              </span>
              {g.isPrimary ? (
                <span className="text-xs font-semibold text-signal-700">Primary</span>
              ) : null}
            </li>
          ))}
          {galleys.length === 0 ? (
            <li className="text-sm text-ink-400">No galleys yet.</li>
          ) : null}
        </ul>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="field">
            <label>Label</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div className="field">
            <label>Format</label>
            <select value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="pdf">PDF</option>
              <option value="html">HTML</option>
              <option value="xml">XML</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="field">
            <label>File name</label>
            <input
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="article.pdf"
            />
          </div>
        </div>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={pending}
          onClick={() => void handleGalley()}
        >
          Add galley
        </button>
      </div>

      <div className="surface space-y-4 p-5 sm:p-6">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-ink-500 uppercase">
            Issue schedule
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            Place this article in a planned issue before atomic publish.
          </p>
        </div>
        {issues.length === 0 ? (
          <p className="text-sm text-ink-400">
            No open issues. Create one under Journal settings.
          </p>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              className="flex-1 rounded border border-line px-3 py-2 text-sm"
              value={issueId}
              onChange={(e) => setIssueId(e.target.value)}
            >
              {issues.map((issue) => (
                <option key={issue.id} value={issue.id}>
                  Vol. {issue.volume} No. {issue.number} ({issue.year}) — {issue.status}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-signal"
              disabled={pending}
              onClick={() => void handleSchedule()}
            >
              Schedule into issue
            </button>
          </div>
        )}
      </div>

      <div className="surface space-y-4 p-5 sm:p-6">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-ink-500 uppercase">
            DOI deposit
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            Queue a Crossref deposit record (live deposit when configured).
          </p>
        </div>
        <div className="field">
          <label htmlFor="deposit-doi">DOI</label>
          <input
            id="deposit-doi"
            value={doi}
            onChange={(e) => setDoi(e.target.value)}
            placeholder="10.xxxx/example.2026.001"
          />
        </div>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={pending}
          onClick={() => void handleDeposit()}
        >
          Queue DOI deposit
        </button>
        {deposits.length > 0 ? (
          <ul className="space-y-2 border-t border-line pt-3">
            {deposits.slice(0, 3).map((d) => (
              <li key={d.id} className="text-sm text-ink-600">
                <span className="font-semibold text-ink-800">{d.doi}</span>
                {' · '}
                {d.status}
                {d.responseDetail ? (
                  <span className="mt-1 block text-xs text-ink-400">
                    {d.responseDetail.slice(0, 120)}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

    </div>
  )
}
