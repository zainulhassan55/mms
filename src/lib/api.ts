const TOKEN_KEY = 'mms.token'

export function getApiBase() {
  const configured = import.meta.env.VITE_API_URL
  if (typeof configured === 'string' && configured.length > 0) {
    return configured.replace(/\/$/, '')
  }
  // Local Vite → API on :4000. Production (same Hostinger host) → relative /api.
  return import.meta.env.DEV ? 'http://localhost:4000' : ''
}

export function getToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY)
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers)
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json')
  }

  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${getApiBase()}${path}`, {
    ...init,
    headers,
  })

  const data = (await response.json().catch(() => ({}))) as {
    ok?: boolean
    error?: string
  } & T

  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`)
  }

  return data
}
