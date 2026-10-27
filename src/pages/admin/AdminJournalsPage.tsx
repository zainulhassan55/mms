import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  DataPanel,
  EmptyState,
  PageHeader,
  ScrollArea,
  SectionTitle,
} from '../../components/ui'
import { useToast } from '../../components/ToastProvider'
import { apiFetch } from '../../lib/api'
import { fetchAdminDirectory } from '../../lib/manuscripts'

type DirectoryState = Awaited<ReturnType<typeof fetchAdminDirectory>>

type JournalRow = {
  id: string
  code: string
  name: string
  issn: string | null
  description: string | null
  sections?: Array<{ id: string; title: string }>
  _count?: { manuscripts: number; memberships: number }
}

export function AdminJournalsPage() {
  const toast = useToast()
  const [data, setData] = useState<DirectoryState | null>(null)
  const [journals, setJournals] = useState<JournalRow[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    code: '',
    name: '',
    issn: '',
    description: '',
    contactEmail: '',
  })

  async function reload() {
    const [directory, journalRes] = await Promise.all([
      fetchAdminDirectory(),
      apiFetch<{ ok: boolean; journals: JournalRow[] }>('/api/journals'),
    ])
    setData(directory)
    setJournals(journalRes.journals)
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        await reload()
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : 'Failed to load directory.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [toast])

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    setCreating(true)
    try {
      await apiFetch('/api/journals', {
        method: 'POST',
        body: JSON.stringify({
          code: form.code.trim(),
          name: form.name.trim(),
          issn: form.issn.trim() || null,
          description: form.description.trim() || null,
          contactEmail: form.contactEmail.trim() || null,
        }),
      })
      setForm({ code: '', name: '', issn: '', description: '', contactEmail: '' })
      toast.success('Journal created with Research/Review sections and email templates.')
      await reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create journal.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="page-stack animate-rise">
      <PageHeader
        title="Journals"
        description="Create journals and open settings for policies, members, issues, and email templates (OJS journal setup)."
        actions={
          <Link to="/manager/journals" className="btn btn-signal">
            Journal settings
          </Link>
        }
      />

      <form className="surface space-y-4 p-5 sm:p-6" onSubmit={handleCreate}>
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-ink-500 uppercase">
            Add journal
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            Creates the journal with default sections (Research / Review) and
            starter email templates. You add editors and issues next in Settings.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="field">
            <label htmlFor="code">Journal code (slug)</label>
            <input
              id="code"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              placeholder="e.g. jces"
              required
              pattern="[A-Za-z0-9-]+"
            />
          </div>
          <div className="field">
            <label htmlFor="name">Journal name</label>
            <input
              id="name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Full journal title"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="issn">ISSN (optional)</label>
            <input
              id="issn"
              value={form.issn}
              onChange={(e) => setForm((f) => ({ ...f, issn: e.target.value }))}
              placeholder="2789-1044"
            />
          </div>
          <div className="field">
            <label htmlFor="contactEmail">Contact email (optional)</label>
            <input
              id="contactEmail"
              type="email"
              value={form.contactEmail}
              onChange={(e) =>
                setForm((f) => ({ ...f, contactEmail: e.target.value }))
              }
              placeholder="editor@journal.example"
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            rows={3}
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            placeholder="Short scope statement for authors and the public site"
            className="resize-y"
          />
        </div>
        <button type="submit" className="btn btn-signal" disabled={creating}>
          {creating ? 'Creating…' : 'Create journal'}
        </button>
      </form>

      <section>
        <SectionTitle title="All journals" />
        <div className="surface overflow-hidden">
          {loading ? (
            <EmptyState>Loading journals…</EmptyState>
          ) : !journals.length ? (
            <EmptyState>No journals yet. Create one above.</EmptyState>
          ) : (
            <ScrollArea size="sm">
              <div className="divide-y divide-line">
                {journals.map((journal) => (
                  <div
                    key={journal.id}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-ink-800">{journal.name}</p>
                      <p className="mt-1 text-sm text-ink-500">
                        {journal.description || 'No description'}
                      </p>
                      <p className="mt-2 text-xs font-medium text-ink-300">
                        {journal.issn ? `ISSN ${journal.issn} · ` : ''}
                        {journal.code}
                        {journal._count
                          ? ` · ${journal._count.manuscripts} manuscripts · ${journal._count.memberships} members`
                          : ''}
                      </p>
                      {journal.sections?.length ? (
                        <p className="mt-1 text-xs text-ink-400">
                          Sections:{' '}
                          {journal.sections.map((s) => s.title).join(', ')}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                      <Link
                        to={`/manager/journals?journal=${journal.id}`}
                        className="btn btn-ghost text-xs"
                      >
                        Configure
                      </Link>
                      <Link
                        to={`/j/${journal.code}`}
                        className="btn btn-ghost text-xs"
                      >
                        Public site
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <DataPanel
          title="Editors"
          count={loading ? undefined : data?.editors.length}
          size="md"
          scroll={!loading && Boolean(data?.editors.length)}
        >
          {loading ? (
            <EmptyState>Loading…</EmptyState>
          ) : !data?.editors.length ? (
            <EmptyState>No editors found. They register, then you add them as members.</EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {data.editors.map((editor) => (
                <li key={editor.id} className="px-4 py-3">
                  <p className="font-semibold text-ink-800">{editor.name}</p>
                  <p className="text-sm text-ink-500">
                    {editor.email}
                    {editor.affiliation ? ` · ${editor.affiliation}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </DataPanel>

        <DataPanel
          title="Reviewer directory"
          count={loading ? undefined : data?.reviewers.length}
          size="md"
          scroll={!loading && Boolean(data?.reviewers.length)}
        >
          {loading ? (
            <EmptyState>Loading…</EmptyState>
          ) : !data?.reviewers.length ? (
            <EmptyState>No reviewers found.</EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {data.reviewers.map((reviewer) => (
                <li key={reviewer.id} className="px-4 py-3">
                  <p className="font-semibold text-ink-800">{reviewer.name}</p>
                  <p className="text-sm text-ink-500">
                    {[reviewer.affiliation, reviewer.expertise]
                      .filter(Boolean)
                      .join(' · ') || reviewer.email}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </DataPanel>
      </section>
    </div>
  )
}
