import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { homePathForRole, useAuth } from './AuthContext'

export function ProtectedRoute() {
  const { isAuthenticated, ready } = useAuth()
  const location = useLocation()

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-ink-500">
        Loading session…
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}

export function GuestRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, ready, user } = useAuth()

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-ink-500">
        Loading session…
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to={homePathForRole(user?.role ?? 'author')} replace />
  }

  return children
}
