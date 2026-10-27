import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router-dom'
import type { ReactNode } from 'react'
import { homePathForRole, useAuth } from './AuthContext'

function isSafeInternalPath(path: string) {
  return path.startsWith('/') && !path.startsWith('//')
}

function buildRedirectTarget(next: string | null, journal: string | null) {
  if (!next || !isSafeInternalPath(next)) return null

  if (!journal) return next

  const url = new URL(next, window.location.origin)
  if (!url.searchParams.get('journal')) {
    url.searchParams.set('journal', journal)
  }
  return `${url.pathname}${url.search}`
}

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
    const params = new URLSearchParams()
    const next = `${location.pathname}${location.search}`
    params.set('next', next)
    const journal = new URLSearchParams(location.search).get('journal')
    if (journal) params.set('journal', journal)

    return <Navigate to={`/login?${params.toString()}`} replace />
  }

  return <Outlet />
}

export function GuestRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, ready, user } = useAuth()
  const [searchParams] = useSearchParams()

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-ink-500">
        Loading session…
      </div>
    )
  }

  if (isAuthenticated) {
    const fromQuery = buildRedirectTarget(
      searchParams.get('next'),
      searchParams.get('journal'),
    )

    return (
      <Navigate
        to={fromQuery ?? homePathForRole(user?.role ?? 'author')}
        replace
      />
    )
  }

  return children
}
