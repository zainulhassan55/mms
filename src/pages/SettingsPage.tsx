import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function SettingsPage() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-rise">
      <div>
        <p className="text-xs font-semibold tracking-[0.14em] text-signal-600 uppercase">
          Preferences
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink-800">
          Account settings
        </h1>
        <p className="mt-2 text-ink-500">
          Basic preferences for email alerts and session security.
        </p>
      </div>

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
        Password and ORCID controls will connect when authentication is finalized.
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
