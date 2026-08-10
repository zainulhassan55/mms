import { Link, NavLink, Outlet } from 'react-router-dom'
import { BrandMark } from './BrandMark'
import { UserMenu } from './UserMenu'

const nav = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/author/submissions', label: 'Submissions' },
  { to: '/notifications', label: 'Notifications' },
  { to: '/profile', label: 'Profile' },
]

export function AppShell() {
  return (
    <div className="app-bg min-h-screen text-ink-800">
      <header className="sticky top-0 z-40 border-b border-line/80 bg-paper-elevated/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <Link to="/dashboard" aria-label="MMS home">
            <BrandMark size="sm" />
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  isActive ? 'nav-link nav-link-active' : 'nav-link'
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/notifications"
              className="relative grid h-10 w-10 place-items-center rounded-full border border-line bg-paper-soft text-ink-600 transition hover:border-ink-300 hover:text-ink-800"
              aria-label="Notifications"
            >
              <BellIcon />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-signal-500 ring-2 ring-white" />
            </Link>
            <UserMenu />
          </div>
        </div>

        <nav
          className="flex gap-1 overflow-x-auto border-t border-line/70 px-4 py-2 md:hidden"
          aria-label="Mobile"
        >
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive ? 'nav-link nav-link-active' : 'nav-link'
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <Outlet />
      </main>
    </div>
  )
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 9a6 6 0 1 1 12 0c0 3.2.8 4.6 1.5 5.5.3.4 0 1-.5 1H5c-.5 0-.8-.6-.5-1C5.2 13.6 6 12.2 6 9Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M10 18a2 2 0 0 0 4 0"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}
