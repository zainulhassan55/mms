import { useEffect, useState, type FormEvent } from 'react'
import { PageHeader } from '../../components/ui'
import { useToast } from '../../components/ToastProvider'
import { apiFetch } from '../../lib/api'
import { roleLabels, type AppRole } from '../../data/mock'

type AdminUser = {
  id: string
  name: string
  email: string
  role: AppRole
  roleLabel: string
  affiliation: string | null
  memberships: Array<{
    id: string
    role: string
    journal: { id: string; code: string; name: string }
  }>
}

const assignableRoles: AppRole[] = [
  'author',
  'editor',
  'reviewer',
  'copyeditor',
  'production',
  'journal_manager',
  'admin',
]

export function AdminUsersPage() {
  const toast = useToast()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [journals, setJournals] = useState<Array<{ id: string; name: string; code: string }>>([])
  const [loading, setLoading] = useState(true)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [attach, setAttach] = useState<Record<string, { journalId: string; memberRole: string }>>({})
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'editor' as AppRole,
    affiliation: '',
    journalId: '',
    memberRole: 'editor',
  })

  async function reload() {
    const [usersRes, journalsRes] = await Promise.all([
      apiFetch<{ ok: boolean; users: AdminUser[] }>('/api/admin/users'),
      apiFetch<{ ok: boolean; journals: Array<{ id: string; name: string; code: string }> }>(
        '/api/journals',
      ),
    ])
    setUsers(usersRes.users)
    setJournals(journalsRes.journals)
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        await reload()
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : 'Failed to load users')
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
      await apiFetch('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
          affiliation: form.affiliation.trim() || null,
          ...(form.journalId
            ? {
                journalId: form.journalId,
                memberRole: form.memberRole || mapRoleToMember(form.role),
              }
            : {}),
        }),
      })
      setForm({
        name: '',
        email: '',
        password: '',
        role: 'editor',
        affiliation: '',
        journalId: form.journalId,
        memberRole: 'editor',
      })
      toast.success('User created.')
      await reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create user')
    } finally {
      setCreating(false)
    }
  }

  async function changeRole(userId: string, role: AppRole) {
    setPendingId(userId)
    try {
      const extra = attach[userId]
      await apiFetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          role,
          ...(extra?.journalId
            ? { journalId: extra.journalId, memberRole: extra.memberRole || mapRoleToMember(role) }
            : {}),
        }),
      })
      toast.success('User updated.')
      await reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="page-stack animate-rise">
      <PageHeader
        eyebrow="Site administration"
        title="Users"
        description="Create accounts, set workspace roles, and attach journal memberships (OJS Users & Roles)."
      />

      <form className="surface space-y-4 p-5 sm:p-6" onSubmit={handleCreate}>
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-ink-500 uppercase">
            Create user
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            Enroll editors, reviewers, copyeditors, and authors. Optionally attach them to a
            journal immediately.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="field">
            <label htmlFor="userName">Full name</label>
            <input
              id="userName"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="field">
            <label htmlFor="userEmail">Email</label>
            <input
              id="userEmail"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="field">
            <label htmlFor="userPassword">Temporary password</label>
            <input
              id="userPassword"
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
          </div>
          <div className="field">
            <label htmlFor="userRole">Workspace role</label>
            <select
              id="userRole"
              value={form.role}
              onChange={(e) => {
                const role = e.target.value as AppRole
                setForm((f) => ({
                  ...f,
                  role,
                  memberRole: mapRoleToMember(role),
                }))
              }}
            >
              {assignableRoles.map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="userAff">Affiliation (optional)</label>
            <input
              id="userAff"
              value={form.affiliation}
              onChange={(e) => setForm((f) => ({ ...f, affiliation: e.target.value }))}
            />
          </div>
          <div className="field">
            <label htmlFor="userJournal">Attach to journal (optional)</label>
            <select
              id="userJournal"
              value={form.journalId}
              onChange={(e) => setForm((f) => ({ ...f, journalId: e.target.value }))}
            >
              <option value="">None yet</option>
              {journals.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.name}
                </option>
              ))}
            </select>
          </div>
          {form.journalId ? (
            <div className="field">
              <label htmlFor="userMemberRole">Journal role</label>
              <select
                id="userMemberRole"
                value={form.memberRole}
                onChange={(e) => setForm((f) => ({ ...f, memberRole: e.target.value }))}
              >
                <option value="journal_manager">Journal manager</option>
                <option value="editor">Editor</option>
                <option value="section_editor">Section editor</option>
                <option value="copyeditor">Copyeditor</option>
                <option value="production">Production</option>
                <option value="reviewer">Reviewer</option>
                <option value="author">Author</option>
              </select>
            </div>
          ) : null}
        </div>
        <button type="submit" className="btn btn-signal" disabled={creating}>
          {creating ? 'Creating…' : 'Create user'}
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-ink-500">Loading users…</p>
      ) : (
        <div className="surface overflow-hidden">
          <ul className="divide-y divide-line">
            {users.map((user) => (
              <li key={user.id} className="space-y-3 px-4 py-4 sm:px-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold text-ink-800">{user.name}</p>
                    <p className="text-sm text-ink-500">{user.email}</p>
                    {user.affiliation ? (
                      <p className="mt-1 text-xs text-ink-400">{user.affiliation}</p>
                    ) : null}
                    {user.memberships.length > 0 ? (
                      <p className="mt-2 text-xs text-ink-500">
                        Journals:{' '}
                        {user.memberships
                          .map((m) => `${m.journal.code} (${m.role})`)
                          .join(', ')}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-ink-400">No journal memberships</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 sm:items-end">
                    <select
                      className="rounded border border-line px-3 py-2 text-sm"
                      value={user.role}
                      disabled={pendingId === user.id}
                      onChange={(e) =>
                        void changeRole(user.id, e.target.value as AppRole)
                      }
                    >
                      {assignableRoles.map((role) => (
                        <option key={role} value={role}>
                          {roleLabels[role]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex flex-col gap-2 rounded-md bg-paper-soft p-3 sm:flex-row sm:items-center">
                  <p className="shrink-0 text-xs font-semibold tracking-wide text-ink-400 uppercase">
                    Attach to journal
                  </p>
                  <select
                    className="rounded border border-line px-2 py-1.5 text-sm"
                    value={attach[user.id]?.journalId ?? ''}
                    onChange={(e) =>
                      setAttach((prev) => ({
                        ...prev,
                        [user.id]: {
                          journalId: e.target.value,
                          memberRole:
                            prev[user.id]?.memberRole || mapRoleToMember(user.role),
                        },
                      }))
                    }
                  >
                    <option value="">Select journal…</option>
                    {journals.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.name}
                      </option>
                    ))}
                  </select>
                  <select
                    className="rounded border border-line px-2 py-1.5 text-sm"
                    value={
                      attach[user.id]?.memberRole || mapRoleToMember(user.role)
                    }
                    onChange={(e) =>
                      setAttach((prev) => ({
                        ...prev,
                        [user.id]: {
                          journalId: prev[user.id]?.journalId ?? '',
                          memberRole: e.target.value,
                        },
                      }))
                    }
                  >
                    <option value="journal_manager">Journal manager</option>
                    <option value="editor">Editor</option>
                    <option value="section_editor">Section editor</option>
                    <option value="copyeditor">Copyeditor</option>
                    <option value="production">Production</option>
                    <option value="reviewer">Reviewer</option>
                    <option value="author">Author</option>
                  </select>
                  <button
                    type="button"
                    className="btn btn-ghost text-xs"
                    disabled={!attach[user.id]?.journalId || pendingId === user.id}
                    onClick={() => void changeRole(user.id, user.role)}
                  >
                    Save membership
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function mapRoleToMember(role: AppRole): string {
  if (role === 'admin') return 'journal_manager'
  if (role === 'office') return 'editor'
  return role
}
