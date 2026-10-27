import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../../components/ui'
import { useToast } from '../../components/ToastProvider'
import { apiFetch } from '../../lib/api'

type Journal = {
  id: string
  code: string
  name: string
  issn: string | null
  description: string | null
  contactEmail: string | null
  reviewType: string
  defaultReviewDays: number
  revisionDays: number
  policiesMarkdown: string | null
  sections?: Section[]
}

type Section = {
  id: string
  code: string
  title: string
  description: string | null
  sortOrder: number
  active?: boolean
}

type Member = {
  id: string
  role: string
  user: { id: string; name: string; email: string; role: string }
}

type EmailTemplate = {
  id: string
  key: string
  name: string
  subject: string
  bodyHtml: string
}

type Issue = {
  id: string
  volume: string
  number: string
  year: number
  title: string | null
  status: string
  manuscripts?: Array<{ id: string; number: string; title: string; status: string }>
  _count?: { manuscripts: number }
}

type TabId =
  | 'masthead'
  | 'contact'
  | 'workflow'
  | 'sections'
  | 'users'
  | 'emails'
  | 'issues'
  | 'policies'

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'masthead', label: 'Masthead' },
  { id: 'contact', label: 'Contact' },
  { id: 'workflow', label: 'Workflow' },
  { id: 'sections', label: 'Sections' },
  { id: 'users', label: 'Users & roles' },
  { id: 'emails', label: 'Emails' },
  { id: 'issues', label: 'Issues' },
  { id: 'policies', label: 'Policies' },
]

export function JournalManagerPage() {
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [journals, setJournals] = useState<Journal[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [form, setForm] = useState<Partial<Journal>>({})
  const [sections, setSections] = useState<Section[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [issues, setIssues] = useState<Issue[]>([])
  const [memberEmail, setMemberEmail] = useState('')
  const [memberRole, setMemberRole] = useState('editor')
  const [sectionForm, setSectionForm] = useState({
    code: '',
    title: '',
    description: '',
  })
  const [issueForm, setIssueForm] = useState({
    volume: '',
    number: '',
    year: String(new Date().getFullYear()),
    title: '',
  })
  const [saving, setSaving] = useState(false)

  const tab = (searchParams.get('tab') as TabId) || 'masthead'
  const journalFromQuery = searchParams.get('journal')

  useEffect(() => {
    void loadJournals()
  }, [])

  useEffect(() => {
    if (!selectedId) return
    void loadDetails(selectedId)
  }, [selectedId])

  useEffect(() => {
    if (!journalFromQuery || !journals.length) return
    const match = journals.find(
      (j) => j.id === journalFromQuery || j.code === journalFromQuery,
    )
    if (match && match.id !== selectedId) {
      setSelectedId(match.id)
      setForm(match)
    }
  }, [journalFromQuery, journals, selectedId])

  async function loadJournals() {
    try {
      const data = await apiFetch<{ ok: boolean; journals: Journal[] }>('/api/journals')
      setJournals(data.journals)
      const preferred =
        journalFromQuery &&
        data.journals.find(
          (j) => j.id === journalFromQuery || j.code === journalFromQuery,
        )
      if (preferred) {
        setSelectedId(preferred.id)
        setForm(preferred)
      } else if (!selectedId && data.journals[0]) {
        setSelectedId(data.journals[0].id)
        setForm(data.journals[0])
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load journals')
    }
  }

  async function loadDetails(id: string) {
    try {
      const [journalRes, membersRes, templatesRes, issuesRes, sectionsRes] =
        await Promise.all([
          apiFetch<{ ok: boolean; journal: Journal }>(`/api/journals/${id}`),
          apiFetch<{ ok: boolean; members: Member[] }>(`/api/journals/${id}/members`),
          apiFetch<{ ok: boolean; templates: EmailTemplate[] }>(
            `/api/journals/${id}/email-templates`,
          ),
          apiFetch<{ ok: boolean; issues: Issue[] }>(`/api/journals/${id}/issues`),
          apiFetch<{ ok: boolean; sections: Section[] }>(`/api/journals/${id}/sections`),
        ])
      setForm(journalRes.journal)
      setMembers(membersRes.members)
      setTemplates(templatesRes.templates)
      setIssues(issuesRes.issues)
      setSections(sectionsRes.sections)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load journal details')
    }
  }

  async function saveSettings(fields?: Partial<Journal>) {
    if (!selectedId) return
    setSaving(true)
    const payload = fields ?? form
    try {
      await apiFetch(`/api/journals/${selectedId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
      toast.success('Journal settings saved.')
      await loadJournals()
      await loadDetails(selectedId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function addMember() {
    if (!selectedId) return
    if (!memberEmail.trim()) {
      toast.error('Enter the user’s email address.')
      return
    }
    try {
      await apiFetch(`/api/journals/${selectedId}/members`, {
        method: 'POST',
        body: JSON.stringify({ email: memberEmail.trim(), role: memberRole }),
      })
      setMemberEmail('')
      toast.success('Role assigned.')
      await loadDetails(selectedId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add member')
    }
  }

  async function removeMember(membershipId: string) {
    if (!selectedId) return
    try {
      await apiFetch(`/api/journals/${selectedId}/members/${membershipId}`, {
        method: 'DELETE',
      })
      toast.success('Membership removed.')
      await loadDetails(selectedId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not remove member')
    }
  }

  async function addSection() {
    if (!selectedId) return
    if (!sectionForm.code.trim() || !sectionForm.title.trim()) {
      toast.error('Section code and title are required.')
      return
    }
    try {
      await apiFetch(`/api/journals/${selectedId}/sections`, {
        method: 'POST',
        body: JSON.stringify(sectionForm),
      })
      setSectionForm({ code: '', title: '', description: '' })
      toast.success('Section created.')
      await loadDetails(selectedId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create section')
    }
  }

  async function removeSection(sectionId: string) {
    if (!selectedId) return
    try {
      await apiFetch(`/api/journals/${selectedId}/sections/${sectionId}`, {
        method: 'DELETE',
      })
      toast.success('Section deactivated.')
      await loadDetails(selectedId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not remove section')
    }
  }

  async function saveTemplate(tpl: EmailTemplate) {
    if (!selectedId) return
    try {
      await apiFetch(`/api/journals/${selectedId}/email-templates/${tpl.key}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: tpl.name,
          subject: tpl.subject,
          bodyHtml: tpl.bodyHtml,
        }),
      })
      toast.success(`Template “${tpl.key}” saved.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Template save failed')
    }
  }

  async function createIssue() {
    if (!selectedId) return
    try {
      await apiFetch(`/api/journals/${selectedId}/issues`, {
        method: 'POST',
        body: JSON.stringify(issueForm),
      })
      setIssueForm({
        volume: '',
        number: '',
        year: String(new Date().getFullYear()),
        title: '',
      })
      toast.success('Issue created.')
      await loadDetails(selectedId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create issue')
    }
  }

  async function publishIssue(issueId: string) {
    try {
      await apiFetch(`/api/issues/${issueId}/publish`, {
        method: 'POST',
        body: '{}',
      })
      toast.success('Issue published.')
      await loadDetails(selectedId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Publish failed')
    }
  }

  const selected = journals.find((j) => j.id === selectedId)

  return (
    <div className="page-stack mx-auto max-w-5xl animate-rise">
      <PageHeader
        eyebrow="Journal manager"
        title="Journal settings"
        description="OJS-style journal setup: masthead, users & roles, sections, workflow, emails, and issues."
        actions={
          <div className="flex flex-wrap gap-2">
            {selected ? (
              <Link to={`/j/${selected.code}`} className="btn btn-ghost">
                Public site
              </Link>
            ) : null}
            <Link to="/editor/queue" className="btn btn-ghost">
              Submissions
            </Link>
            <Link to="/admin/journals" className="btn btn-signal">
              All journals
            </Link>
          </div>
        }
      />

      <div className="field max-w-lg">
        <label htmlFor="journalSelect">Working journal</label>
        <select
          id="journalSelect"
          value={selectedId}
          onChange={(e) => {
            const id = e.target.value
            setSelectedId(id)
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev)
              next.set('journal', id)
              return next
            })
          }}
        >
          {journals.map((j) => (
            <option key={j.id} value={j.id}>
              {j.name} ({j.code})
            </option>
          ))}
        </select>
      </div>

      <nav className="overflow-x-auto border-b border-line" aria-label="Journal settings tabs">
        <ul className="flex gap-1 pb-px">
          {TABS.map((item) => {
            const active = tab === item.id
            return (
              <li key={item.id} className="shrink-0">
                <button
                  type="button"
                  className={`border-b-2 px-3 py-2.5 text-sm font-semibold transition ${
                    active
                      ? 'border-signal-600 text-signal-800'
                      : 'border-transparent text-ink-500 hover:text-ink-800'
                  }`}
                  onClick={() =>
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev)
                      next.set('tab', item.id)
                      if (selectedId) next.set('journal', selectedId)
                      return next
                    })
                  }
                >
                  {item.label}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {tab === 'masthead' ? (
        <section className="surface space-y-4 p-5 sm:p-6">
          <h2 className="font-semibold text-ink-800">Masthead</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="field sm:col-span-2">
              <label>Journal title</label>
              <input
                value={form.name ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Path / code</label>
              <input value={form.code ?? ''} disabled className="opacity-70" />
            </div>
            <div className="field">
              <label>ISSN</label>
              <input
                value={form.issn ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, issn: e.target.value }))}
              />
            </div>
            <div className="field sm:col-span-2">
              <label>Description (public)</label>
              <textarea
                rows={4}
                className="resize-y"
                value={form.description ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
          </div>
          <button
            type="button"
            className="btn btn-signal"
            disabled={saving}
            onClick={() =>
              void saveSettings({
                name: form.name,
                issn: form.issn,
                description: form.description,
              })
            }
          >
            {saving ? 'Saving…' : 'Save masthead'}
          </button>
        </section>
      ) : null}

      {tab === 'contact' ? (
        <section className="surface space-y-4 p-5 sm:p-6">
          <h2 className="font-semibold text-ink-800">Contact</h2>
          <div className="field max-w-md">
            <label>Principal contact email</label>
            <input
              type="email"
              value={form.contactEmail ?? ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, contactEmail: e.target.value }))
              }
            />
          </div>
          <button
            type="button"
            className="btn btn-signal"
            disabled={saving}
            onClick={() => void saveSettings({ contactEmail: form.contactEmail })}
          >
            {saving ? 'Saving…' : 'Save contact'}
          </button>
        </section>
      ) : null}

      {tab === 'workflow' ? (
        <section className="surface space-y-4 p-5 sm:p-6">
          <h2 className="font-semibold text-ink-800">Review workflow</h2>
          <p className="text-sm text-ink-500">
            Matches OJS review settings: review type and default deadlines.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="field">
              <label>Review type</label>
              <select
                value={form.reviewType ?? 'single_blind'}
                onChange={(e) =>
                  setForm((f) => ({ ...f, reviewType: e.target.value }))
                }
              >
                <option value="double_blind">Double-blind</option>
                <option value="single_blind">Single-blind</option>
                <option value="open">Open</option>
              </select>
            </div>
            <div className="field">
              <label>Default review days</label>
              <input
                type="number"
                value={form.defaultReviewDays ?? 21}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    defaultReviewDays: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="field">
              <label>Author revision days</label>
              <input
                type="number"
                value={form.revisionDays ?? 30}
                onChange={(e) =>
                  setForm((f) => ({ ...f, revisionDays: Number(e.target.value) }))
                }
              />
            </div>
          </div>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-ink-600">
            <li>Submission → screening</li>
            <li>Peer review (rounds)</li>
            <li>Copyediting</li>
            <li>Production / proofs</li>
            <li>Issue publication</li>
          </ol>
          <button
            type="button"
            className="btn btn-signal"
            disabled={saving}
            onClick={() =>
              void saveSettings({
                reviewType: form.reviewType,
                defaultReviewDays: form.defaultReviewDays,
                revisionDays: form.revisionDays,
              })
            }
          >
            {saving ? 'Saving…' : 'Save workflow'}
          </button>
        </section>
      ) : null}

      {tab === 'sections' ? (
        <section className="surface space-y-4 p-5 sm:p-6">
          <h2 className="font-semibold text-ink-800">Journal sections</h2>
          <p className="text-sm text-ink-500">
            Authors choose a section at submission (OJS sections).
          </p>
          <ul className="divide-y divide-line text-sm">
            {sections.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-start justify-between gap-3 py-3"
              >
                <div>
                  <p className="font-semibold text-ink-800">{s.title}</p>
                  <p className="text-xs text-ink-400">
                    {s.code}
                    {s.description ? ` · ${s.description}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost text-xs text-rose-600"
                  onClick={() => void removeSection(s.id)}
                >
                  Deactivate
                </button>
              </li>
            ))}
            {sections.length === 0 ? (
              <li className="py-3 text-ink-400">No active sections.</li>
            ) : null}
          </ul>
          <div className="grid gap-3 border-t border-line pt-4 sm:grid-cols-3">
            <input
              className="rounded border border-line px-3 py-2 text-sm"
              placeholder="Code (e.g. research)"
              value={sectionForm.code}
              onChange={(e) =>
                setSectionForm((f) => ({ ...f, code: e.target.value }))
              }
            />
            <input
              className="rounded border border-line px-3 py-2 text-sm"
              placeholder="Title"
              value={sectionForm.title}
              onChange={(e) =>
                setSectionForm((f) => ({ ...f, title: e.target.value }))
              }
            />
            <input
              className="rounded border border-line px-3 py-2 text-sm"
              placeholder="Description"
              value={sectionForm.description}
              onChange={(e) =>
                setSectionForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </div>
          <button type="button" className="btn btn-signal" onClick={() => void addSection()}>
            Add section
          </button>
        </section>
      ) : null}

      {tab === 'users' ? (
        <section className="surface space-y-4 p-5 sm:p-6">
          <h2 className="font-semibold text-ink-800">Users & roles</h2>
          <p className="text-sm text-ink-500">
            Assign journal-scoped roles (OJS Users & Roles). Users must already have an
            account.
          </p>
          <ul className="divide-y divide-line text-sm">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <span>
                  <span className="font-semibold text-ink-800">{m.user.name}</span>
                  <span className="text-ink-400"> · {m.user.email}</span>
                  <span className="mt-1 block text-xs font-medium text-signal-700">
                    {m.role}
                  </span>
                </span>
                <button
                  type="button"
                  className="btn btn-ghost text-xs text-rose-600"
                  onClick={() => void removeMember(m.id)}
                >
                  Remove
                </button>
              </li>
            ))}
            {members.length === 0 ? (
              <li className="py-3 text-ink-400">No members yet.</li>
            ) : null}
          </ul>
          <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row">
            <input
              className="flex-1 rounded border border-line px-3 py-2 text-sm"
              placeholder="user@example.edu"
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
            />
            <select
              className="rounded border border-line px-3 py-2 text-sm"
              value={memberRole}
              onChange={(e) => setMemberRole(e.target.value)}
            >
              <option value="journal_manager">Journal manager</option>
              <option value="editor">Editor</option>
              <option value="section_editor">Section editor</option>
              <option value="copyeditor">Copyeditor</option>
              <option value="production">Production</option>
              <option value="reviewer">Reviewer</option>
              <option value="author">Author</option>
            </select>
            <button type="button" className="btn btn-signal" onClick={() => void addMember()}>
              Assign role
            </button>
          </div>
          <Link to="/admin/users" className="inline-block text-sm font-semibold text-signal-700">
            Manage all site users →
          </Link>
        </section>
      ) : null}

      {tab === 'emails' ? (
        <section className="surface space-y-4 p-5 sm:p-6">
          <h2 className="font-semibold text-ink-800">Prepared emails</h2>
          {templates.map((tpl) => (
            <div key={tpl.id} className="space-y-2 rounded border border-line p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                {tpl.name} ({tpl.key})
              </p>
              <input
                className="w-full rounded border border-line px-3 py-2 text-sm"
                value={tpl.subject}
                onChange={(e) =>
                  setTemplates((list) =>
                    list.map((t) =>
                      t.id === tpl.id ? { ...t, subject: e.target.value } : t,
                    ),
                  )
                }
              />
              <textarea
                rows={4}
                className="w-full rounded border border-line px-3 py-2 text-sm"
                value={tpl.bodyHtml}
                onChange={(e) =>
                  setTemplates((list) =>
                    list.map((t) =>
                      t.id === tpl.id ? { ...t, bodyHtml: e.target.value } : t,
                    ),
                  )
                }
              />
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => void saveTemplate(tpl)}
              >
                Save template
              </button>
            </div>
          ))}
          {templates.length === 0 ? (
            <p className="text-sm text-ink-400">No templates yet.</p>
          ) : null}
        </section>
      ) : null}

      {tab === 'issues' ? (
        <section className="surface space-y-4 p-5 sm:p-6">
          <h2 className="font-semibold text-ink-800">Issues</h2>
          <p className="text-sm text-ink-500">
            Create issues, schedule articles from production, then publish atomically.
          </p>
          <ul className="divide-y divide-line text-sm">
            {issues.map((issue) => (
              <li
                key={issue.id}
                className="flex flex-wrap items-start justify-between gap-2 py-3"
              >
                <div>
                  <p className="font-semibold text-ink-800">
                    Vol. {issue.volume} No. {issue.number} ({issue.year})
                  </p>
                  <p className="text-xs text-ink-400">
                    {issue.status}
                    {issue._count ? ` · ${issue._count.manuscripts} articles` : ''}
                    {issue.title ? ` · ${issue.title}` : ''}
                  </p>
                  {issue.manuscripts?.length ? (
                    <ul className="mt-2 space-y-1 text-xs text-ink-500">
                      {issue.manuscripts.map((m) => (
                        <li key={m.id}>
                          {m.number}: {m.title}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                {issue.status !== 'published' ? (
                  <button
                    type="button"
                    className="btn btn-signal text-xs"
                    onClick={() => void publishIssue(issue.id)}
                  >
                    Publish issue
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-signal-700">Published</span>
                )}
              </li>
            ))}
          </ul>
          <div className="grid gap-2 border-t border-line pt-4 sm:grid-cols-4">
            <input
              className="rounded border border-line px-3 py-2 text-sm"
              placeholder="Volume"
              value={issueForm.volume}
              onChange={(e) => setIssueForm((f) => ({ ...f, volume: e.target.value }))}
            />
            <input
              className="rounded border border-line px-3 py-2 text-sm"
              placeholder="Number"
              value={issueForm.number}
              onChange={(e) => setIssueForm((f) => ({ ...f, number: e.target.value }))}
            />
            <input
              className="rounded border border-line px-3 py-2 text-sm"
              placeholder="Year"
              value={issueForm.year}
              onChange={(e) => setIssueForm((f) => ({ ...f, year: e.target.value }))}
            />
            <input
              className="rounded border border-line px-3 py-2 text-sm"
              placeholder="Title (optional)"
              value={issueForm.title}
              onChange={(e) => setIssueForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <button type="button" className="btn btn-signal" onClick={() => void createIssue()}>
            Create issue
          </button>
          <Link to="/production/queue" className="ml-3 text-sm font-semibold text-signal-700">
            Open production queue →
          </Link>
        </section>
      ) : null}

      {tab === 'policies' ? (
        <section className="surface space-y-4 p-5 sm:p-6">
          <h2 className="font-semibold text-ink-800">Policies (public site)</h2>
          <p className="text-sm text-ink-500">
            Markdown powers About, APC, Author instructions, Editorial process, and Ethics
            tabs on the public journal site. Use ## headings for each section.
          </p>
          <textarea
            rows={18}
            className="w-full resize-y rounded border border-line px-3 py-2 font-mono text-sm"
            value={form.policiesMarkdown ?? ''}
            onChange={(e) =>
              setForm((f) => ({ ...f, policiesMarkdown: e.target.value }))
            }
          />
          <button
            type="button"
            className="btn btn-signal"
            disabled={saving}
            onClick={() =>
              void saveSettings({ policiesMarkdown: form.policiesMarkdown })
            }
          >
            {saving ? 'Saving…' : 'Save policies'}
          </button>
        </section>
      ) : null}
    </div>
  )
}
