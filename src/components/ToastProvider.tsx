import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ToastCard, type ToastItemData, type ToastTone } from './Toast'

type ToastInput = {
  message: string
  title?: string
  tone?: ToastTone
  durationMs?: number
}

type ToastApi = {
  push: (input: ToastInput | string) => string
  success: (message: string, title?: string) => string
  error: (message: string, title?: string) => string
  info: (message: string, title?: string) => string
  warning: (message: string, title?: string) => string
  dismiss: (id: string) => void
  clear: () => void
}

const ToastContext = createContext<ToastApi | null>(null)

let toastSeq = 0

function normalize(
  input: ToastInput | string,
  tone: ToastTone = 'info',
): Omit<ToastItemData, 'id'> {
  if (typeof input === 'string') {
    return { message: input, tone, durationMs: tone === 'error' ? 6500 : 4500 }
  }
  return {
    message: input.message,
    title: input.title,
    tone: input.tone ?? tone,
    durationMs:
      input.durationMs ??
      ((input.tone ?? tone) === 'error' || (input.tone ?? tone) === 'warning'
        ? 6500
        : 4500),
  }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItemData[]>([])

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const clear = useCallback(() => setItems([]), [])

  const push = useCallback((input: ToastInput | string) => {
    const id = `toast-${Date.now()}-${++toastSeq}`
    const next = { id, ...normalize(input) }
    setItems((prev) => [...prev.slice(-4), next])
    return id
  }, [])

  const api = useMemo<ToastApi>(
    () => ({
      push,
      dismiss,
      clear,
      success: (message, title) => push({ message, title, tone: 'success' }),
      error: (message, title) => push({ message, title, tone: 'error' }),
      info: (message, title) => push({ message, title, tone: 'info' }),
      warning: (message, title) => push({ message, title, tone: 'warning' }),
    }),
    [push, dismiss, clear],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed top-4 right-4 z-[200] flex flex-col gap-3 sm:top-5 sm:right-5"
        aria-label="Notifications"
      >
        {items.map((item) => (
          <ToastCard key={item.id} item={item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return ctx
}
