import { useEffect, useState } from 'react'

type ToastTone = 'success' | 'error' | 'info'

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
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVisible(false)
      onClose?.()
    }, durationMs)
    return () => window.clearTimeout(timer)
  }, [durationMs, onClose])

  if (!visible) return null

  const tones: Record<ToastTone, string> = {
    success: 'border-signal-100 bg-white text-ink-800',
    error: 'border-rose-50 bg-white text-ink-800',
    info: 'border-sky-50 bg-white text-ink-800',
  }

  const accents: Record<ToastTone, string> = {
    success: 'bg-signal-500',
    error: 'bg-rose-600',
    info: 'bg-sky-700',
  }

  return (
    <div
      className="pointer-events-none fixed top-5 right-5 z-[100] w-[min(22rem,calc(100vw-2rem))] animate-fade"
      role="status"
      aria-live="polite"
    >
      <div
        className={`pointer-events-auto overflow-hidden rounded-[var(--radius-lg)] border shadow-[var(--shadow-lift)] ${tones[tone]}`}
      >
        <div className="flex gap-3 p-4">
          <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${accents[tone]}`} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink-800">
              {tone === 'success'
                ? 'Success'
                : tone === 'error'
                  ? 'Something went wrong'
                  : 'Notice'}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-ink-500">{message}</p>
          </div>
          <button
            type="button"
            className="shrink-0 text-ink-300 transition hover:text-ink-600"
            aria-label="Dismiss"
            onClick={() => {
              setVisible(false)
              onClose?.()
            }}
          >
            ×
          </button>
        </div>
      </div>
    </div>
  )
}
