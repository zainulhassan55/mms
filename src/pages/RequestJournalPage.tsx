import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/ui'
import { useToast } from '../components/ToastProvider'
import { apiFetch } from '../lib/api'

type JournalRequestRow = {
  id: string
  proposedCode: string
  proposedName: string
  status: 'pending' | 'approved' | 'rejected'
  adminNote: string | null
  createdAt: string
  journal: { id: string; code: string; name: string } | null
}

const statusLabel: Record<string, string> = {
  pending: 'Pending review',
  approved: 'Approved',
  rejected: 'Not approved',
}

export function RequestJournalPage() {
  const toast = useToast()
  const [pending, setPending] = useState(false)
  const [mine, setMine] = useState<JournalRequestRow[]>([])
  const [form, setForm] = useState({
    proposedCode: '',
    proposedName: '',
    issn: '',
    description: '',
    contactEmail: '',
  })

  async function reload() {
    const data = await apiFetch<{ ok: boolean; requests: JournalRequestRow[] }>(
      '/api/journal-requests/mine',
    )
    setMine(data.requests)
  }

  useEffect(() => {
    void reload().catch((err) =>
      toast.error(err instanceof Error ? err.message : 'Could not load requests'),
    )
  }, [toast])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    try {
      await apiFetch('/api/journal-requests', {
        method: 'POST',
        body: JSON.stringify({
          proposedCode: form.proposedCode.trim(),
          proposedName: form.proposedName.trim(),
          issn: form.issn.trim() || null,
          description: form.description.trim() || null,
          contactEmail: form.contactEmail.trim() || null,
        }),
      })
      setForm({
        proposedCode: '',
        proposedName: '',
        issn: '',
        description: '',
        contactEmail: '',
      })
      toast.success('Request submitted. Platform admin will review it.')
      await reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not submit request')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="page-stack mx-auto max-w-3xl animate-rise">
      <PageHeader
        title="Request a journal"
        description="Ask to host your journal on this platform. After approval you become the journal manager and can invite editors and receive submissions."
      />

      <form className="surface space-y-4 p-5 sm:p-6" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="field sm:col-span-2">
            <label htmlFor="proposedName">Journal name</label>
            <input
              id="proposedName"
              required
              value={form.proposedName}
              onChange={(e) =>
                setForm((f) => ({ ...f, proposedName: e.target.value }))
              }
              placeholder="International Journal of …"
            />
          </div>
          <div className="field">
            <label htmlFor="proposedCode">Suggested code (URL slug)</label>
            <input
              id="proposedCode"
              required
              value={form.proposedCode}
              onChange={(e) =>
                setForm((f) => ({ ...f, proposedCode: e.target.value }))
              }
              placeholder="ijdh"
            />
          </div>
          <div className="field">
            <label htmlFor="issn">ISSN (optional)</label>
            <input
              id="issn"
              value={form.issn}
              onChange={(e) => setForm((f) => ({ ...f, issn: e.target.value }))}
            />
          </div>
          <div className="field sm:col-span-2">
            <label htmlFor="contactEmail">Contact email</label>
            <input
              id="contactEmail"
              type="email"
              value={form.contactEmail}
              onChange={(e) =>
                setForm((f) => ({ ...f, contactEmail: e.target.value }))
              }
              placeholder="editor@yourjournal.org"
            />
          </div>
          <div className="field sm:col-span-2">
            <label htmlFor="description">Short description</label>
            <textarea
              id="description"
              rows={4}
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              className="resize-y"
              placeholder="Scope and audience of the journal…"
            />
          </div>
        </div>
        <button type="submit" className="btn btn-signal" disabled={pending}>
          {pending ? 'Submitting…' : 'Submit request'}
        </button>
      </form>

      <section className="surface p-5 sm:p-6">
        <h2 className="text-sm font-semibold tracking-wide text-ink-500 uppercase">
          Your requests
        </h2>
        {mine.length === 0 ? (
          <p className="mt-3 text-sm text-ink-500">No requests yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {mine.map((item) => (
              <li key={item.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold text-ink-800">{item.proposedName}</p>
                  <p className="text-xs text-ink-500">
                    Code <span className="font-mono">{item.proposedCode}</span> ·{' '}
                    {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                  {item.adminNote ? (
                    <p className="mt-1 text-sm text-ink-600">Note: {item.adminNote}</p>
                  ) : null}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-ink-700">
                    {statusLabel[item.status] ?? item.status}
                  </p>
                  {item.status === 'approved' && item.journal ? (
                    <Link
                      to="/manager/journals"
                      className="mt-1 inline-block text-sm font-semibold text-signal-700"
                    >
                      Open settings →
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
