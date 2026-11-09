import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { BrandMark } from '../BrandMark'

type PublicSiteChromeProps = {
  children: React.ReactNode
}

const navItems = [
  { label: 'Journals', to: '/journals' },
  { label: 'How it works', to: '/how-it-works' },
  { label: 'For editors', to: '/for-editors' },
]

export function PublicSiteChrome({ children }: PublicSiteChromeProps) {
  const { isAuthenticated } = useAuth()
  const [open, setOpen] = useState(false)

  function close() {
    setOpen(false)
  }

  return (
    <div className="public-site min-h-screen bg-[var(--pub-page)] text-[var(--pub-ink)]">
      <header className="public-topnav sticky top-0 z-40">
        <div className="mx-auto flex h-[4.25rem] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="shrink-0" onClick={close}>
            <BrandMark variant="dark" size="sm" link={false} />
          </Link>

          <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Primary">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-md px-3.5 py-2 text-[0.93rem] font-medium transition ${
                    isActive
                      ? 'bg-[var(--pub-page)] text-[var(--pub-ink)]'
                      : 'text-[var(--pub-ink-soft)] hover:bg-[var(--pub-page)] hover:text-[var(--pub-ink)]'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-2.5 md:flex">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="rounded-md bg-[var(--pub-ink)] px-3.5 py-2 text-[0.93rem] font-semibold text-white transition hover:bg-black"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="rounded-md px-3 py-2 text-[0.93rem] font-medium text-[var(--pub-ink-soft)] transition hover:text-[var(--pub-ink)]"
                >
                  Register
                </Link>
                <Link
                  to="/login"
                  className="rounded-md bg-[var(--pub-ink)] px-3.5 py-2 text-[0.93rem] font-semibold text-white transition hover:bg-black"
                >
                  Log in
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[var(--pub-line)] text-[var(--pub-ink)] md:hidden"
            aria-expanded={open}
            aria-controls="public-mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              {open ? (
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>
        </div>

        {open ? (
          <div
            id="public-mobile-nav"
            className="border-t border-[var(--pub-line)] bg-white px-4 py-3 md:hidden"
          >
            <div className="flex flex-col gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className="rounded-md px-3 py-2.5 text-sm font-medium text-[var(--pub-ink)]"
                  onClick={close}
                >
                  {item.label}
                </NavLink>
              ))}
              <div className="my-2 h-px bg-[var(--pub-line)]" />
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="rounded-md bg-[var(--pub-ink)] px-3 py-2.5 text-center text-sm font-semibold text-white"
                  onClick={close}
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="rounded-md px-3 py-2.5 text-sm font-medium text-[var(--pub-ink)]"
                    onClick={close}
                  >
                    Register
                  </Link>
                  <Link
                    to="/login"
                    className="rounded-md bg-[var(--pub-ink)] px-3 py-2.5 text-center text-sm font-semibold text-white"
                    onClick={close}
                  >
                    Log in
                  </Link>
                </>
              )}
            </div>
          </div>
        ) : null}
      </header>

      <main>{children}</main>

      <footer className="border-t border-[var(--pub-line)] bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div>
            <BrandMark variant="dark" size="sm" link={false} />
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-[var(--pub-muted)]">
              Professional manuscript management for scholarly journals.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm font-medium text-[var(--pub-ink-soft)]">
            <NavLink to="/journals" className="hover:text-[var(--pub-ink)]">
              Journals
            </NavLink>
            <NavLink to="/how-it-works" className="hover:text-[var(--pub-ink)]">
              How it works
            </NavLink>
            <NavLink to="/for-editors" className="hover:text-[var(--pub-ink)]">
              For editors
            </NavLink>
            <NavLink to="/login" className="hover:text-[var(--pub-ink)]">
              Log in
            </NavLink>
          </div>
        </div>
        <div className="border-t border-[var(--pub-line)] bg-[var(--pub-page)]">
          <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-[var(--pub-muted)] sm:px-6">
            © {new Date().getFullYear()} CCRI Research · Manuscript Management
            System
          </p>
        </div>
      </footer>
    </div>
  )
}
