import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function ProfilePage() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-rise">
      <div>
        <p className="text-xs font-semibold tracking-[0.14em] text-signal-600 uppercase">
          Account
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink-800">
          Your profile
        </h1>
        <p className="mt-2 text-ink-500">
          Basic author details used across submissions and correspondence.
        </p>
      </div>

      <div className="surface p-5 sm:p-6">
        <div className="flex items-center gap-4 border-b border-line pb-5">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-signal-100 text-lg font-semibold text-signal-700">
            {user.initials}
          </span>
          <div>
            <p className="text-lg font-semibold text-ink-800">{user.name}</p>
            <p className="text-sm text-ink-500">{user.role}</p>
          </div>
        </div>

        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Email" value={user.email} />
          <Field label="Affiliation" value={user.affiliation} />
          <Field label="Role" value={user.role} />
          <Field label="ORCID" value="Not linked yet" />
        </dl>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link to="/settings" className="btn btn-ghost">
          Account settings
        </Link>
        <Link to="/dashboard" className="btn btn-signal">
          Back to dashboard
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
