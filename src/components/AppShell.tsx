import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import type { AppRole } from '../data/mock'
import { BrandMark } from './BrandMark'
import { UserMenu } from './UserMenu'

type NavItem = { to: string; label: string; icon: IconName }

type IconName =
  | 'dashboard'
  | 'submissions'
  | 'alerts'
  | 'profile'
  | 'queue'
  | 'invitations'
  | 'active'
  | 'history'
  | 'analytics'
  | 'portal'
  | 'journals'

const navByRole: Record<AppRole, NavItem[]> = {
  author: [
    { to: '/author/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { to: '/author/submissions', label: 'Submissions', icon: 'submissions' },
    { to: '/notifications', label: 'Alerts', icon: 'alerts' },
    { to: '/profile', label: 'Profile', icon: 'profile' },
  ],
  office: [
    { to: '/editor/queue', label: 'Queue', icon: 'queue' },
    { to: '/notifications', label: 'Alerts', icon: 'alerts' },
    { to: '/profile', label: 'Profile', icon: 'profile' },
  ],
  editor: [
    { to: '/editor/queue', label: 'Queue', icon: 'queue' },
    { to: '/copyedit/queue', label: 'Copyedit', icon: 'active' },
    { to: '/production/queue', label: 'Production', icon: 'queue' },
    { to: '/manager/journals', label: 'Journals', icon: 'journals' },
    { to: '/notifications', label: 'Alerts', icon: 'alerts' },
    { to: '/profile', label: 'Profile', icon: 'profile' },
  ],
  reviewer: [
    { to: '/reviewer/invitations', label: 'Invitations', icon: 'invitations' },
    { to: '/reviewer/active', label: 'Active', icon: 'active' },
    { to: '/reviewer/history', label: 'History', icon: 'history' },
    { to: '/profile', label: 'Profile', icon: 'profile' },
  ],
  production: [
    { to: '/production/queue', label: 'Queue', icon: 'queue' },
    { to: '/notifications', label: 'Alerts', icon: 'alerts' },
    { to: '/profile', label: 'Profile', icon: 'profile' },
  ],
  admin: [
    { to: '/editor/queue', label: 'Editorial', icon: 'queue' },
    { to: '/admin/journals', label: 'Journals', icon: 'journals' },
    { to: '/manager/journals', label: 'Settings', icon: 'journals' },
    { to: '/admin/users', label: 'Users', icon: 'profile' },
    { to: '/copyedit/queue', label: 'Copyedit', icon: 'active' },
    { to: '/production/queue', label: 'Production', icon: 'queue' },
    { to: '/admin/analytics', label: 'Analytics', icon: 'analytics' },
    { to: '/admin/portal-sync', label: 'Portal', icon: 'portal' },
    { to: '/profile', label: 'Profile', icon: 'profile' },
  ],
  journal_manager: [
    { to: '/manager/journals', label: 'Settings', icon: 'journals' },
    { to: '/editor/queue', label: 'Submissions', icon: 'queue' },
    { to: '/copyedit/queue', label: 'Copyedit', icon: 'active' },
    { to: '/production/queue', label: 'Production', icon: 'queue' },
    { to: '/notifications', label: 'Alerts', icon: 'alerts' },
    { to: '/profile', label: 'Profile', icon: 'profile' },
  ],
  copyeditor: [
    { to: '/copyedit/queue', label: 'Queue', icon: 'queue' },
    { to: '/notifications', label: 'Alerts', icon: 'alerts' },
    { to: '/profile', label: 'Profile', icon: 'profile' },
  ],
}

export function AppShell() {
  const { user } = useAuth()
  const location = useLocation()
  const role = user?.role ?? 'author'
  const nav = navByRole[role]
  const home = nav[0]?.to ?? '/author/dashboard'
  const [drawer, setDrawer] = useState({ open: false, path: location.pathname })
  const mobileOpen = drawer.open && drawer.path === location.pathname

  function openMobileMenu() {
    setDrawer({ open: true, path: location.pathname })
  }

  function closeMobileMenu() {
    setDrawer((current) => ({ ...current, open: false }))
  }

  function toggleMobileMenu() {
    if (mobileOpen) closeMobileMenu()
    else openMobileMenu()
  }

  useEffect(() => {
    if (!mobileOpen) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setDrawer((current) => ({ ...current, open: false }))
      }
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [mobileOpen])

  return (
    <div className="shell-layout min-h-screen text-ink-800">
      {mobileOpen ? (
        <button
          type="button"
          className="shell-backdrop"
          aria-label="Close menu"
          onClick={closeMobileMenu}
        />
      ) : null}

      <aside
        id="shell-sidebar-nav"
        className={`shell-sidebar ${mobileOpen ? 'shell-sidebar-open' : ''}`}
        aria-label="Primary"
      >
        <div className="shell-sidebar-inner">
          <div className="shell-brand">
            <Link to={home} aria-label="MMS home" className="block">
              <BrandMark variant="light" size="sm" />
            </Link>
          </div>

          <nav className="shell-nav">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/author/dashboard'}
                className={({ isActive }) =>
                  isActive ? 'shell-nav-link shell-nav-link-active' : 'shell-nav-link'
                }
                onClick={closeMobileMenu}
              >
                <NavIcon name={item.icon} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="shell-user">
            <UserMenu variant="sidebar" />
          </div>
        </div>
      </aside>

      <div className="shell-main">
        <header className="shell-mobile-bar">
          <button
            type="button"
            className="shell-menu-btn"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            aria-controls="shell-sidebar-nav"
            onClick={toggleMobileMenu}
          >
            {mobileOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
          <Link to={home} aria-label="MMS home">
            <BrandMark size="sm" />
          </Link>
          <UserMenu />
        </header>

        <main className="shell-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function NavIcon({ name }: { name: IconName }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    'aria-hidden': true as const,
  }

  const icons: Record<IconName, ReactNode> = {
    dashboard: (
      <svg {...common}>
        <rect x="3" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
        <rect x="13" y="3" width="8" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
        <rect x="13" y="10" width="8" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
        <rect x="3" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    ),
    submissions: (
      <svg {...common}>
        <path
          d="M7 3h7l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path d="M14 3v4h4M8 12h8M8 16h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    ),
    alerts: (
      <svg {...common}>
        <path
          d="M6 9a6 6 0 1 1 12 0c0 3.2.8 4.6 1.5 5.5.3.4 0 1-.5 1H5c-.5 0-.8-.6-.5-1C5.2 13.6 6 12.2 6 9Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path d="M10 18a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    ),
    profile: (
      <svg {...common}>
        <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M5 19c1.6-3 4-4.5 7-4.5s5.4 1.5 7 4.5"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    ),
    queue: (
      <svg {...common}>
        <rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M9 8h6M9 12h6M9 16h4"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    ),
    invitations: (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.7" />
        <path d="m3 7 9 6 9-6" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      </svg>
    ),
    active: (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
        <path d="M12 8v4l2.5 2.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    ),
    history: (
      <svg {...common}>
        <path
          d="M4 12a8 8 0 1 0 2.3-5.6"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <path d="M4 5v4h4M12 8v4l2.5 1.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    ),
    analytics: (
      <svg {...common}>
        <path
          d="M4 19V5M4 19h16"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <path
          d="M8 16v-5M12 16V8M16 16v-8"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    ),
    portal: (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
        <path d="M4 12h16M12 4c2.5 2.8 2.5 13.2 0 16M12 4c-2.5 2.8-2.5 13.2 0 16" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
    journals: (
      <svg {...common}>
        <path
          d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 0-2 2V4Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path d="M9 8h6M9 12h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    ),
  }

  return <span className="shell-nav-icon">{icons[name]}</span>
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 6l12 12M18 6 6 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}
