import { useEffect, useId, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function UserMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (!user) return null

  function handleLogout() {
    setOpen(false)
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="flex items-center gap-2.5 rounded-full border border-transparent py-1 pr-1 pl-1 transition hover:border-line hover:bg-paper-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-500 sm:pr-2.5"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="grid h-10 w-10 place-items-center rounded-full bg-signal-100 font-semibold text-signal-700">
          {user.initials}
        </span>
        <span className="hidden leading-tight text-left sm:block">
          <span className="block text-sm font-semibold text-ink-800">{user.name}</span>
          <span className="block text-xs text-ink-500">{user.role}</span>
        </span>
        <ChevronIcon open={open} />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Account menu"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-[var(--radius-lg)] border border-line bg-paper-elevated shadow-[var(--shadow-lift)] animate-fade"
        >
          <div className="border-b border-line bg-paper-soft px-4 py-3">
            <p className="text-sm font-semibold text-ink-800">{user.name}</p>
            <p className="mt-0.5 truncate text-xs text-ink-500">{user.email}</p>
            <p className="mt-1 text-xs font-medium text-signal-700">{user.role}</p>
          </div>

          <div className="p-1.5">
            <MenuLink to="/profile" onNavigate={() => setOpen(false)}>
              Profile
            </MenuLink>
            <MenuLink to="/notifications" onNavigate={() => setOpen(false)}>
              Notifications
            </MenuLink>
            <MenuLink to="/settings" onNavigate={() => setOpen(false)}>
              Account settings
            </MenuLink>
          </div>

          <div className="border-t border-line p-1.5">
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
              onClick={handleLogout}
            >
              <LogoutIcon />
              Log out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function MenuLink({
  to,
  children,
  onNavigate,
}: {
  to: string
  children: string
  onNavigate: () => void
}) {
  return (
    <Link
      to={to}
      role="menuitem"
      className="flex w-full items-center rounded-md px-3 py-2.5 text-sm font-semibold text-ink-700 transition hover:bg-ink-50 hover:text-ink-800"
      onClick={onNavigate}
    >
      {children}
    </Link>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`hidden text-ink-500 transition sm:block ${open ? 'rotate-180' : ''}`}
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M10 7V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-1"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M15 12H4m0 0 3-3m-3 3 3 3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
