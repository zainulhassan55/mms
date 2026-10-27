import { useEffect, useState } from 'react'

export type ToastTone = 'success' | 'error' | 'info' | 'warning'

export type ToastItemData = {
  id: string
  message: string
  title?: string
  tone: ToastTone
  durationMs: number
}

const TONE_META: Record<
  ToastTone,
  { title: string; iconBg: string; iconColor: string; bar: string; ring: string }
> = {
  success: {
    title: 'Success',
    iconBg: 'bg-signal-50',
    iconColor: 'text-signal-600',
    bar: 'bg-signal-500',
    ring: 'ring-signal-100',
  },
  error: {
    title: 'Something went wrong',
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-600',
    bar: 'bg-rose-500',
    ring: 'ring-rose-100',
  },
  info: {
    title: 'Notice',
    iconBg: 'bg-sky-50',
    iconColor: 'text-sky-700',
    bar: 'bg-sky-600',
    ring: 'ring-sky-100',
  },
  warning: {
    title: 'Please check',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-700',
    bar: 'bg-amber-500',
    ring: 'ring-amber-100',
  },
}

function ToastIcon({ tone }: { tone: ToastTone }) {
  const className = 'h-4 w-4'
  if (tone === 'success') {
    return (
      <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
        <path
          fillRule="evenodd"
          d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.25 7.333a1 1 0 0 1-1.44.02L3.29 9.82a1 1 0 1 1 1.42-1.408l3.58 3.612 6.53-6.606a1 1 0 0 1 1.384-.128Z"
          clipRule="evenodd"
        />
      </svg>
    )
  }
  if (tone === 'error') {
    return (
      <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm2.53-10.53a.75.75 0 0 0-1.06-1.06L10 7.94 8.53 6.41a.75.75 0 1 0-1.06 1.06L8.94 9l-1.47 1.47a.75.75 0 1 0 1.06 1.06L10 10.06l1.47 1.47a.75.75 0 1 0 1.06-1.06L11.06 9l1.47-1.53Z"
          clipRule="evenodd"
        />
      </svg>
    )
  }
  if (tone === 'warning') {
    return (
      <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
        <path
          fillRule="evenodd"
          d="M8.49 3.34c.66-1.15 2.36-1.15 3.02 0l6.26 10.9c.66 1.15-.17 2.59-1.51 2.59H3.74c-1.34 0-2.17-1.44-1.51-2.59l6.26-10.9ZM10 7a.75.75 0 0 0-.75.75v3.5a.75.75 0 0 0 1.5 0v-3.5A.75.75 0 0 0 10 7Zm0 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
          clipRule="evenodd"
        />
      </svg>
    )
  }
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-4a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm1 4.75a.75.75 0 0 0-1.5 0v3.5a.75.75 0 0 0 1.5 0v-3.5Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

/** Single toast card — used by ToastProvider viewport. */
export function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItemData
  onDismiss: (id: string) => void
}) {
  const [leaving, setLeaving] = useState(false)
  const meta = TONE_META[item.tone]
  const title = item.title ?? meta.title

  useEffect(() => {
    if (item.durationMs <= 0) return
    const leaveAt = window.setTimeout(() => setLeaving(true), item.durationMs - 220)
    const removeAt = window.setTimeout(() => onDismiss(item.id), item.durationMs)
    return () => {
      window.clearTimeout(leaveAt)
      window.clearTimeout(removeAt)
    }
  }, [item.durationMs, item.id, onDismiss])

  return (
    <div
      className={`toast-item pointer-events-auto w-[min(24rem,calc(100vw-1.5rem))] ${
        leaving ? 'toast-item-leave' : 'toast-item-enter'
      }`}
      role={item.tone === 'error' || item.tone === 'warning' ? 'alert' : 'status'}
      aria-live={item.tone === 'error' ? 'assertive' : 'polite'}
    >
      <div
        className={`relative overflow-hidden rounded-[1rem] border border-line/80 bg-white/95 shadow-[var(--shadow-lift)] ring-1 backdrop-blur-md ${meta.ring}`}
      >
        <div className="flex gap-3 p-4 pr-3">
          <span
            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${meta.iconBg} ${meta.iconColor}`}
          >
            <ToastIcon tone={item.tone} />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-sm font-semibold tracking-tight text-ink-800">{title}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-500">{item.message}</p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-md px-1.5 text-lg leading-none text-ink-300 transition hover:bg-ink-50 hover:text-ink-600"
            aria-label="Dismiss notification"
            onClick={() => {
              setLeaving(true)
              window.setTimeout(() => onDismiss(item.id), 180)
            }}
          >
            ×
          </button>
        </div>
        {item.durationMs > 0 ? (
          <div className="h-1 bg-ink-50">
            <div
              className={`toast-progress h-full origin-left ${meta.bar}`}
              style={{ animationDuration: `${item.durationMs}ms` }}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}

/**
 * @deprecated Prefer `useToast()` from ToastProvider for app-wide notifications.
 * Kept so older call sites that mount a single toast still compile during migration.
 */
export function Toast({
  message,
  tone = 'success',
  onClose,
  durationMs = 4500,
}: {
  message: string
  tone?: ToastTone
  onClose?: () => void
  durationMs?: number
}) {
  return (
    <div className="pointer-events-none fixed top-5 right-5 z-[100]">
      <ToastCard
        item={{
          id: 'legacy',
          message,
          tone,
          durationMs,
        }}
        onDismiss={() => onClose?.()}
      />
    </div>
  )
}
