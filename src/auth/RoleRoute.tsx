import { Navigate, Outlet } from 'react-router-dom'
import type { AppRole } from '../data/mock'
import { homePathForRole, useAuth } from './AuthContext'

export function RoleRoute({ allow }: { allow: AppRole[] }) {
  const { user, ready } = useAuth()

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-ink-500">
        Loading session…
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!allow.includes(user.role)) {
    return <Navigate to={homePathForRole(user.role)} replace />
  }

  return <Outlet />
}
