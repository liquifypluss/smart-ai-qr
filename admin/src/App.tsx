import { useCallback, useEffect, useState } from 'react'
import { adminApi, AdminApiError, type Session } from './api'
import { Dashboard } from './Dashboard'
import { Login } from './Login'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [notice, setNotice] = useState('')
  const expire = useCallback(() => { setSession(null); setNotice('Your session has expired. Please sign in again.') }, [])
  useEffect(() => {
    let active = true
    adminApi.session().then(value => { if (active) setSession(value) }).catch((issue: unknown) => {
      if (active && !(issue instanceof AdminApiError && issue.status === 401)) setState('error')
    }).finally(() => { if (active) setState(current => current === 'error' ? current : 'ready') })
    return () => { active = false }
  }, [])
  useEffect(() => {
    if (!session) return
    const remaining = Date.parse(session.expiresAt) - Date.now()
    if (remaining <= 0) { expire(); return }
    const timer = window.setTimeout(expire, Math.min(remaining, 2147483647))
    return () => window.clearTimeout(timer)
  }, [session, expire])
  async function logout() {
    if (!session) return
    try { await adminApi.logout(session.csrfToken); setSession(null); setNotice('You have signed out.') }
    catch (issue: unknown) {
      if (issue instanceof AdminApiError && issue.status === 401) { expire(); return }
      throw issue
    }
  }
  if (state === 'loading') return <div className="auth-status" role="status"><section className="panel"><h1>AIBawaal</h1><p>Checking your secure session…</p></section></div>
  if (state === 'error') return <div className="auth-status"><section className="panel"><h1>Connection unavailable</h1><p>We couldn't verify your session. Check your connection and reload.</p><button className="btn btn-primary" onClick={() => window.location.reload()}>Retry</button></section></div>
  if (!session) return <Login onSuccess={(value) => { setSession(value); setNotice('') }} notice={notice} />
  return <Dashboard user={session.user} onExpired={expire} onLogout={logout} />
}
