export type Operator = { id: string; email: string; role: 'super_admin' | 'admin' }
export type Session = { user: Operator; csrfToken: string; expiresAt: string }
export type Overview = {
  metrics: { totalBusinesses: number; activeBusinesses: number; totalLocations: number; totalQrCodes: number; activeQrCodes: number }
  recentBusinesses: { id: string; name: string; slug: string; category: string; status: 'active' | 'inactive'; createdAt: string }[]
  recentActivity: { action: string; createdAt: string }[]
}

export class AdminApiError extends Error { constructor(public status: number) { super(`Request failed (${status})`) } }

const origin = (import.meta.env.VITE_ADMIN_API_ORIGIN ?? '').replace(/\/$/, '')

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  if (!origin || !/^https:\/\/[^/]+$/.test(origin)) throw new Error('VITE_ADMIN_API_ORIGIN is not configured')
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 12000)
  try {
    const response = await fetch(`${origin}${path}`, {
      ...options,
      credentials: 'include',
      cache: 'no-store',
      signal: controller.signal,
      headers: { ...(options?.body && !(options.body instanceof FormData) ? { 'content-type': 'application/json' } : {}), ...options?.headers }
    })
    if (!response.ok) throw new AdminApiError(response.status)
    if (response.status === 204) return undefined as T
    return await response.json() as T
  } finally { window.clearTimeout(timeout) }
}

export const adminApi = {
  session: () => request<Session>('/api/v1/admin/auth/session'),
  login: (email: string, password: string, remember: boolean) => request<Session>('/api/v1/admin/auth/login', { method: 'POST', body: JSON.stringify({ email, password, remember }) }),
  logout: (csrfToken: string) => request<{ status: string }>('/api/v1/admin/auth/logout', { method: 'POST', headers: { 'x-csrf-token': csrfToken } }),
  overview: () => request<Overview>('/api/v1/admin/overview')
}
