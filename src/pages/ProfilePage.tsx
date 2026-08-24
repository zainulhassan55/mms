import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { PageHeader } from '../components/ui'

export function ProfilePage() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <div className="page-stack animate-rise">
      <PageHeader
        title="Your profile"
        description="Basic account details used across submissions and correspondence."
      />

      <div className="surface p-5 sm:p-6">
        <div className="flex items-center gap-4 border-b border-line pb-5">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-signal-100 text-lg font-semibold text-signal-700">
            {user.initials}
          </span>
          <div>
            <p className="text-lg font-semibold text-ink-800">{user.name}</p>
            <p className="text-sm text-ink-500">{user.roleLabel}</p>
          </div>
        </div>

        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Email" value={user.email} />
          <Field label="Affiliation" value={user.affiliation} />
          <Field label="Role" value={user.roleLabel} />
          <Field label="ORCID" value="Not linked yet" />
        </dl>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link to="/settings" className="btn btn-ghost">
          Account settings
        </Link>
        <Link to="/notifications" className="btn btn-ghost">
          Notifications
        </Link>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-wide text-ink-300 uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-ink-800">{value}</dd>
    </div>
  )
}
