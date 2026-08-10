import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { BrandMark } from '../components/BrandMark'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [email, setEmail] = useState('amina.rahman@example.edu')
  const [password, setPassword] = useState('demo')

  const from =
    (location.state as { from?: string } | null)?.from &&
    (location.state as { from?: string }).from !== '/login'
      ? (location.state as { from: string }).from
      : '/dashboard'

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    login(email)
    navigate(from, { replace: true })
  }

  return (
    <div className="auth-canvas relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-[1.5rem] border border-white/15 bg-white/5 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur-sm lg:grid-cols-[1.15fr_0.95fr]">
        <section className="relative flex flex-col justify-between gap-10 p-8 sm:p-10 lg:p-12">
          <div className="animate-rise">
            <BrandMark variant="light" size="lg" />
          </div>

          <div className="max-w-md space-y-4 animate-rise-delay-1">
            <h1
              className="font-display text-4xl leading-[1.08] font-semibold tracking-tight sm:text-5xl"
              style={{ color: '#ffffff' }}
            >
              Submit. Review. Publish — with clarity at every step.
            </h1>
            <p
              className="text-base leading-relaxed sm:text-lg"
              style={{ color: 'rgba(255,255,255,0.78)' }}
            >
              Track your manuscript from first draft through peer review,
              production, and online publication.
            </p>
          </div>

          <ul
            className="grid gap-3 text-sm sm:grid-cols-3 animate-rise-delay-2"
            style={{ color: 'rgba(255,255,255,0.78)' }}
          >
            {[
              'Real-time status',
              'Role-clear workflows',
              'Full audit trail',
            ].map((item) => (
              <li
                key={item}
                className="rounded-xl border border-white/12 bg-white/8 px-3.5 py-3 font-medium"
              >
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="border-t border-white/10 bg-paper-elevated p-8 sm:p-10 lg:border-t-0 lg:border-l lg:border-white/10 animate-fade">
          <div className="mb-8">
            <p className="text-xs font-semibold tracking-[0.14em] text-signal-600 uppercase">
              Welcome back
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink-800">
              Sign in to MMS
            </h2>
            <p className="mt-2 text-sm text-ink-500">
              Authors, reviewers, and editors use the same secure workspace.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="password">Password</label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-signal-600 hover:text-signal-700"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-signal w-full">
              Sign in
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-500">
            New author?{' '}
            <Link
              to="/register"
              className="font-semibold text-signal-700 underline decoration-signal-400/60 underline-offset-4 hover:text-signal-600"
            >
              Create an account
            </Link>
          </p>

          <p className="mt-8 rounded-xl bg-paper px-3.5 py-3 text-center text-xs text-ink-500">
            Demo mode — any credentials will sign you in.
          </p>
        </section>
      </div>
    </div>
  )
}
