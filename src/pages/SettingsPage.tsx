import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { PageHeader } from '../components/ui'
import { useToast } from '../components/ToastProvider'
import { apiFetch } from '../lib/api'

export function SettingsPage() {
  const { user, changePassword } = useAuth()
  const toast = useToast()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pending, setPending] = useState(false)
  const [notifyEmail, setNotifyEmail] = useState(true)
  const [notifyDeadlines, setNotifyDeadlines] = useState(true)
  const [notifyDecisions, setNotifyDecisions] = useState(true)
  const [prefsPending, setPrefsPending] = useState(false)

  useEffect(() => {
    void apiFetch<{
      ok: boolean
      user: {
        notifyEmail?: boolean
        notifyDeadlines?: boolean
        notifyDecisions?: boolean
      }
    }>('/api/auth/me')
      .then((data) => {
        setNotifyEmail(data.user.notifyEmail !== false)
        setNotifyDeadlines(data.user.notifyDeadlines !== false)
        setNotifyDecisions(data.user.notifyDecisions !== false)
      })
      .catch(() => {
        /* keep defaults */
      })
  }, [])

  if (!user) return null

  async function handlePassword(event: FormEvent) {
    event.preventDefault()
    if (newPassword !== confirm) {
      toast.error('New passwords do not match.')
      return
    }
    setPending(true)
    try {
      await changePassword(currentPassword, newPassword)
      toast.success('Password updated.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirm('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update password.')
    } finally {
      setPending(false)
    }
  }

  async function savePrefs() {
    setPrefsPending(true)
    try {
      await apiFetch('/api/auth/notification-prefs', {
        method: 'PATCH',
        body: JSON.stringify({
          notifyEmail,
          notifyDeadlines,
          notifyDecisions,
        }),
      })
      toast.success('Notification preferences saved.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save preferences.')
    } finally {
      setPrefsPending(false)
    }
  }

  return (
    <div className="page-stack animate-rise">
      <PageHeader
        title="Account settings"
        description="Manage your password and notification preferences."
      />

      <form className="surface space-y-4 p-5 sm:p-6" onSubmit={handlePassword}>
        <h2 className="text-sm font-semibold tracking-wide text-ink-700 uppercase">
          Change password
        </h2>
        <div className="field">
          <label htmlFor="currentPassword">Current password</label>
          <input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        <div className="field">
          <label htmlFor="newPassword">New password</label>
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>
        <div className="field">
          <label htmlFor="confirm">Confirm new password</label>
          <input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>
        <button type="submit" className="btn btn-signal" disabled={pending}>
          {pending ? 'Saving…' : 'Update password'}
        </button>
      </form>

      <div className="surface space-y-5 p-5 sm:p-6">
        <h2 className="text-sm font-semibold tracking-wide text-ink-700 uppercase">
          Notifications
        </h2>
        <ToggleRow
          title="Email notifications"
          description="Receive updates when manuscript status changes."
          checked={notifyEmail}
          onChange={setNotifyEmail}
        />
        <ToggleRow
          title="Deadline reminders"
          description="Remind me before revision and proof deadlines."
          checked={notifyDeadlines}
          onChange={setNotifyDeadlines}
        />
        <ToggleRow
          title="Decision notices"
          description="Notify me when editorial decisions are recorded."
          checked={notifyDecisions}
          onChange={setNotifyDecisions}
        />
        <button
          type="button"
          className="btn btn-ghost"
          disabled={prefsPending}
          onClick={() => void savePrefs()}
        >
          {prefsPending ? 'Saving…' : 'Save notification preferences'}
        </button>
      </div>

      <div className="surface-quiet p-4 text-sm text-ink-500">
        Signed in as <span className="font-semibold text-ink-800">{user.email}</span>.
      </div>

      <Link to="/profile" className="btn btn-ghost">
        View profile
      </Link>
    </div>
  )
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block text-sm font-semibold text-ink-800">{title}</span>
        <span className="mt-1 block text-sm text-ink-500">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 accent-[var(--color-signal-600)]"
      />
    </label>
  )
}
