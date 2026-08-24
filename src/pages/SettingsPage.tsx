import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { PageHeader } from '../components/ui'

export function SettingsPage() {
  const { user, changePassword } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  if (!user) return null

  async function handlePassword(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    if (newPassword !== confirm) {
      setError('New passwords do not match.')
      return
    }
    setPending(true)
    try {
      await changePassword(currentPassword, newPassword)
      setMessage('Password updated.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirm('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update password.')
    } finally {
      setPending(false)
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
        {error ? (
          <p className="rounded-[var(--radius-md)] bg-rose-50 px-3 py-2 text-sm text-rose-600">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="rounded-[var(--radius-md)] bg-signal-50 px-3 py-2 text-sm text-signal-700">
            {message}
          </p>
        ) : null}
        <button type="submit" className="btn btn-signal" disabled={pending}>
          {pending ? 'Saving…' : 'Update password'}
        </button>
      </form>

      <div className="surface space-y-5 p-5 sm:p-6">
        <ToggleRow
          title="Email notifications"
          description="Receive updates when manuscript status changes."
          defaultChecked
        />
        <ToggleRow
          title="Deadline reminders"
          description="Remind me before revision and proof deadlines."
          defaultChecked
        />
        <ToggleRow
          title="Review invitations"
          description="Notify me when I am invited to review a manuscript."
          defaultChecked
        />
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
  defaultChecked = false,
}: {
  title: string
  description: string
  defaultChecked?: boolean
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block text-sm font-semibold text-ink-800">{title}</span>
        <span className="mt-1 block text-sm text-ink-500">{description}</span>
      </span>
      <input
        type="checkbox"
        defaultChecked={defaultChecked}
        className="mt-1 h-4 w-4 accent-[var(--color-signal-600)]"
      />
    </label>
  )
}
