import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

type PageHeaderProps = {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}

/** Back navigation used on manuscript / form detail pages. */
export function BackLink({
  to,
  children,
}: {
  to: string
  children: ReactNode
}) {
  return (
    <Link to={to} className="shell-back">
      {children}
    </Link>
  )
}

/** Title block for manuscript detail and workflow form pages. */
export function DetailHeader({
  backTo,
  backLabel,
  meta,
  title,
  subtitle,
  badge,
}: {
  backTo: string
  backLabel: string
  meta?: ReactNode
  title: string
  subtitle?: ReactNode
  badge?: ReactNode
}) {
  return (
    <div>
      <BackLink to={backTo}>{backLabel}</BackLink>
      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          {meta ? (
            <p className="text-xs font-semibold tracking-wide text-signal-600">
              {meta}
            </p>
          ) : null}
          <h1
            className={`font-display text-[1.85rem] leading-[1.12] font-semibold tracking-tight text-ink-800 sm:text-[2.15rem] ${
              meta ? 'mt-2' : 'mt-0'
            }`}
          >
            {title}
          </h1>
          {subtitle ? (
            <div className="mt-2 text-sm text-ink-500">{subtitle}</div>
          ) : null}
        </div>
        {badge}
      </div>
    </div>
  )
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <section className="page-hero flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 max-w-2xl">
        {eyebrow ? (
          <p className="text-[0.68rem] font-semibold tracking-[0.16em] text-signal-600 uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1.5 font-display text-[1.85rem] leading-[1.12] font-semibold tracking-tight text-ink-800 sm:text-[2.15rem]">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-xl text-[0.95rem] leading-relaxed text-ink-500">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </section>
  )
}

export function SectionTitle({
  title,
  count,
  description,
  action,
  flush = false,
}: {
  title: string
  count?: number
  description?: string
  action?: ReactNode
  flush?: boolean
}) {
  return (
    <div className={flush ? '' : 'mb-3'}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <h2 className="text-base font-semibold text-ink-800">{title}</h2>
          {typeof count === 'number' ? (
            <span className="panel-count">{count}</span>
          ) : null}
        </div>
        {action}
      </div>
      {description ? (
        <p className="mt-1 text-sm text-ink-500">{description}</p>
      ) : null}
    </div>
  )
}

export function Notice({
  tone = 'info',
  title,
  children,
}: {
  tone?: 'info' | 'success' | 'warn'
  title?: string
  children: ReactNode
}) {
  const tones = {
    info: 'border-sky-50 bg-sky-50 text-sky-700',
    success: 'border-signal-100 bg-signal-50 text-signal-700',
    warn: 'border-amber-50 bg-amber-50 text-amber-600',
  }

  return (
    <div className={`rounded-[1rem] border px-4 py-3 text-sm ${tones[tone]}`}>
      {title ? <p className="font-semibold">{title}</p> : null}
      <div className={title ? 'mt-1 opacity-90' : ''}>{children}</div>
    </div>
  )
}

export function EmptyState({
  children,
  title,
  icon,
}: {
  children: ReactNode
  title?: string
  icon?: ReactNode
}) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon" aria-hidden>
        {icon ?? <EmptyIcon />}
      </span>
      {title ? (
        <p className="text-sm font-semibold text-ink-800">{title}</p>
      ) : null}
      <div className="max-w-sm text-sm leading-relaxed text-ink-500">{children}</div>
    </div>
  )
}

function EmptyIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M7 7h10M7 12h6M7 17h8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  )
}

type StatTone = 'teal' | 'amber' | 'green' | 'sky'

export function StatCard({
  label,
  value,
  accent = false,
  tone = 'teal',
  icon,
}: {
  label: string
  value: string
  accent?: boolean
  tone?: StatTone
  icon?: ReactNode
}) {
  const toneClass =
    tone === 'amber'
      ? 'stat-icon-amber'
      : tone === 'green'
        ? 'stat-icon-green'
        : tone === 'sky'
          ? 'stat-icon-sky'
          : 'stat-icon-teal'

  return (
    <div className={`stat-card ${accent ? 'stat-card-accent' : ''}`.trim()}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.72rem] font-semibold tracking-[0.08em] text-ink-500 uppercase">
            {label}
          </p>
          <p
            className={`mt-2 font-display text-[1.85rem] font-semibold tracking-tight ${
              accent ? 'text-amber-600' : 'text-ink-800'
            }`}
          >
            {value}
          </p>
        </div>
        <span className={`stat-icon ${toneClass}`} aria-hidden>
          {icon ?? <DocIcon />}
        </span>
      </div>
    </div>
  )
}

function DocIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M7 3h7l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  )
}

type ScrollSize = 'sm' | 'md' | 'lg'

/** Caps tall list content with a styled scrollbar so the page stays compact. */
export function ScrollArea({
  children,
  size = 'md',
  className = '',
  fade = false,
}: {
  children: ReactNode
  size?: ScrollSize
  className?: string
  fade?: boolean
}) {
  return (
    <div className={fade ? 'scroll-fade' : undefined}>
      <div
        className={`scroll-area scroll-area-${size} ${className}`.trim()}
        tabIndex={0}
        role="region"
        aria-label="Scrollable list"
      >
        {children}
      </div>
    </div>
  )
}

type DataPanelProps = {
  title: string
  count?: number
  description?: string
  action?: ReactNode
  children: ReactNode
  size?: ScrollSize
  accent?: boolean
  className?: string
  /** When true, skip scroll wrapper (e.g. empty / loading states). */
  scroll?: boolean
}

/** Card with header + scrollable body for dense data. */
export function DataPanel({
  title,
  count,
  description,
  action,
  children,
  size = 'md',
  accent = false,
  className = '',
  scroll = true,
}: DataPanelProps) {
  return (
    <section className={`surface overflow-hidden ${className}`.trim()}>
      <div className={`panel-head ${accent ? 'panel-head-accent' : ''}`.trim()}>
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2.5">
            <h2 className="text-sm font-semibold tracking-wide text-ink-800">
              {title}
            </h2>
            {typeof count === 'number' ? (
              <span
                className={`panel-count ${accent ? 'panel-count-accent' : ''}`.trim()}
              >
                {count}
              </span>
            ) : null}
          </div>
          {description ? (
            <p className="mt-1 text-xs text-ink-500">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {scroll ? <ScrollArea size={size}>{children}</ScrollArea> : children}
    </section>
  )
}
