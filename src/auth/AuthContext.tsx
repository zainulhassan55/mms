import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { roleLabels, type AppRole } from '../data/mock'
import { apiFetch, clearToken, getToken, setToken } from '../lib/api'

const USER_KEY = 'mms.user'

export type AuthUser = {
  id: string
  name: string
  email: string
  affiliation: string
  role: AppRole
  roleLabel: string
  initials: string
}

type AuthContextValue = {
  user: AuthUser | null
  isAuthenticated: boolean
  ready: boolean
  login: (email: string, password: string) => Promise<AuthUser>
  logout: () => void
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readStoredUser(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem(USER_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

function storeUser(user: AuthUser | null) {
  try {
    if (user) sessionStorage.setItem(USER_KEY, JSON.stringify(user))
    else sessionStorage.removeItem(USER_KEY)
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(readStoredUser)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function restore() {
      const token = getToken()
      if (!token) {
        if (!cancelled) {
          setUser(null)
          setReady(true)
        }
        return
      }

      try {
        const data = await apiFetch<{ ok: boolean; user: AuthUser }>('/api/auth/me')
        if (!cancelled) {
          setUser(data.user)
          storeUser(data.user)
        }
      } catch {
        clearToken()
        storeUser(null)
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setReady(true)
      }
    }

    void restore()
    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      ready,
      async login(email: string, password: string) {
        const data = await apiFetch<{ ok: boolean; token: string; user: AuthUser }>(
          '/api/auth/login',
          {
            method: 'POST',
            body: JSON.stringify({ email, password }),
          },
        )
        setToken(data.token)
        storeUser(data.user)
        setUser(data.user)
        return data.user
      },
      logout() {
        clearToken()
        storeUser(null)
        setUser(null)
      },
      async changePassword(currentPassword: string, newPassword: string) {
        await apiFetch('/api/auth/change-password', {
          method: 'POST',
          body: JSON.stringify({ currentPassword, newPassword }),
        })
      },
    }),
    [user, ready],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}

export function homePathForRole(role: AppRole) {
  if (role === 'office' || role === 'editor') return '/editor/queue'
  if (role === 'reviewer') return '/reviewer/invitations'
  if (role === 'production') return '/production/queue'
  if (role === 'admin') return '/admin/analytics'
  return '/author/dashboard'
}

export { roleLabels }
