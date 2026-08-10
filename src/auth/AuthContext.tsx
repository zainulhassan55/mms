import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { currentUser } from '../data/mock'

const AUTH_KEY = 'mms.auth'

type AuthUser = {
  name: string
  email: string
  affiliation: string
  role: string
  initials: string
}

type AuthContextValue = {
  user: AuthUser | null
  isAuthenticated: boolean
  login: (email: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readStoredAuth(): boolean {
  try {
    return sessionStorage.getItem(AUTH_KEY) === '1'
  } catch {
    return false
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(readStoredAuth)

  const value = useMemo<AuthContextValue>(
    () => ({
      user: isAuthenticated ? currentUser : null,
      isAuthenticated,
      login(email: string) {
        try {
          sessionStorage.setItem(AUTH_KEY, '1')
          sessionStorage.setItem('mms.email', email)
        } catch {
          /* ignore */
        }
        setIsAuthenticated(true)
      },
      logout() {
        try {
          sessionStorage.removeItem(AUTH_KEY)
          sessionStorage.removeItem('mms.email')
        } catch {
          /* ignore */
        }
        setIsAuthenticated(false)
      },
    }),
    [isAuthenticated],
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
