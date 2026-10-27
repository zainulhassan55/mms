import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { homePathForRole, useAuth } from '../auth/AuthContext'
import { BrandMark } from '../components/BrandMark'
import { PasswordInput } from '../components/PasswordInput'
import { useToast } from '../components/ToastProvider'

const PORTAL_JOURNAL_KEY = 'mms.portalJournal'

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

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { login } = useAuth()
  const toast = useToast()
  const locationState =
    (location.state as {
      registered?: boolean
      email?: string
      from?: string
    } | null) ?? null

  const nextParam = searchParams.get('next')
  const journalParam = searchParams.get('journal')

  const [email, setEmail] = useState(locationState?.email ?? '')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)

  const redirectAfterLogin = useMemo(() => {
    const fromQuery = buildRedirectTarget(nextParam, journalParam)
    if (fromQuery) return fromQuery

    if (locationState?.from && locationState.from !== '/login') {
      return locationState.from
    }

    return null
  }, [nextParam, journalParam, locationState?.from])

  useEffect(() => {
    if (journalParam) {
      sessionStorage.setItem(PORTAL_JOURNAL_KEY, journalParam)
    }
  }, [journalParam])

  useEffect(() => {
    if (locationState?.registered) {
      navigate(location.pathname + location.search, {
        replace: true,
        state: redirectAfterLogin ? { from: redirectAfterLogin } : {},
      })
    }
  }, [
    locationState?.registered,
    location.pathname,
    location.search,
    navigate,
    redirectAfterLogin,
  ])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    if (!email.trim()) {
      toast.error('Please enter your email.')
      return
    }
    if (!password) {
      toast.error('Please enter your password.')
      return
    }

    setPending(true)
    try {
      const signedIn = await login(email.trim(), password)
      navigate(redirectAfterLogin ?? homePathForRole(signedIn.role), {
        replace: true,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sign in failed.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="auth-canvas relative min-h-screen lg:grid lg:grid-cols-2">
      <aside className="relative z-10 hidden min-h-screen flex-col justify-between p-10 xl:p-14 lg:flex">
        <div className="animate-rise">
          <BrandMark variant="light" size="lg" />
        </div>

        <div className="max-w-lg space-y-4 animate-rise-delay-1">
          <h1 className="font-display text-[2.55rem] leading-[1.06] font-semibold tracking-tight text-white xl:text-[2.95rem]">
            Manuscripts, managed with clarity.
          </h1>
          <p className="max-w-md text-[0.95rem] leading-relaxed text-white/70">
            One workspace for submission, peer review, production, and
            publication — each role in its own queue.
          </p>
          <ul className="mt-6 space-y-2.5 text-sm text-white/65">
            <li className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-signal-400" />
              Role-locked dashboards and secure accounts
            </li>
            <li className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-signal-400" />
              End-to-end editorial workflow
            </li>
            <li className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-signal-400" />
              Production proofs and portal sync
            </li>
          </ul>
        </div>

        <p className="text-sm text-white/45 animate-rise-delay-2">
          CCRI · Manuscript Management System
        </p>
      </aside>

      <section className="relative z-10 flex min-h-screen items-center justify-center overflow-y-auto bg-white px-4 py-10 sm:px-8 lg:bg-paper-elevated lg:px-12">
        <div className="w-full max-w-[24.5rem] animate-fade">
          <div className="mb-7 lg:hidden">
            <BrandMark size="md" />
          </div>

          <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-signal-600 uppercase">
            Sign in
          </p>
          <h2 className="mt-2 font-display text-[1.8rem] font-semibold tracking-tight text-ink-800">
            Welcome back
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">
            Use your MMS account. Your dashboard matches the role you registered
            with.
          </p>

          <form className="mt-7 space-y-3.5" onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@institution.edu"
              />
            </div>

            <PasswordInput
              id="password"
              label="Password"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
            />

            <div className="-mt-0.5 flex justify-end">
              <Link
                to="/forgot-password"
                className="text-xs font-semibold text-signal-600 hover:text-signal-700"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              className="btn btn-signal w-full"
              disabled={pending}
            >
              {pending ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-ink-500">
            New here?{' '}
            <Link
              to={{ pathname: '/register', search: location.search }}
              className="font-semibold text-signal-700 underline decoration-signal-400/40 underline-offset-4 hover:text-signal-600"
            >
              Create an account
            </Link>
          </p>
        </div>
      </section>
    </div>
  )
}
