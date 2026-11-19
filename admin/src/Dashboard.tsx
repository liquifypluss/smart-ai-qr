import { useEffect, useRef, useState } from 'react'
import { adminApi, AdminApiError, type Operator, type Overview } from './api'
import { Brand, Icon } from './Icons'

function date(value: string) { return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) }
function initials(email: string) { return email.split('@')[0].split(/[._-]/).map(value => value[0] ?? '').join('').slice(0, 2).toUpperCase() || 'AD' }

export function Dashboard({ user, onExpired, onLogout }: { user: Operator; onExpired: () => void; onLogout: () => Promise<void> }) {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [drawer, setDrawer] = useState(false)
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 1023px)').matches)
  const [loggingOut, setLoggingOut] = useState(false)
  const menuRef = useRef<HTMLButtonElement>(null)
  const sidebarRef = useRef<HTMLElement>(null)

  useEffect(() => {
    let active = true
    adminApi.overview().then(value => { if (active) setOverview(value) }).catch((issue: unknown) => {
      if (!active) return
      if (issue instanceof AdminApiError && issue.status === 401) onExpired()
      else setError(issue instanceof AdminApiError && issue.status === 403 ? 'Your administrator role does not permit dashboard access.' : 'The overview could not be loaded. Try refreshing the page.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [onExpired])

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)')
    const update = () => { setMobile(media.matches); if (!media.matches) setDrawer(false) }
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (!drawer) return
    const sidebar = sidebarRef.current
    sidebar?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') { setDrawer(false); menuRef.current?.focus() }
      if (event.key === 'Tab' && sidebar) {
        const controls = [...sidebar.querySelectorAll<HTMLElement>('button:not(:disabled),a[href]')]
        if (!controls.length) return
        if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus() }
        else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0].focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawer])

  async function logout() {
    if (loggingOut) return
    setLoggingOut(true)
    try { await onLogout() } catch { setLoggingOut(false); setError('Could not sign out. Try again.') }
  }

  const links = [{ label: 'Overview', icon: 'grid' as const, active: true },{label:'Businesses',icon:'buildings' as const,active:false},{label:'QR Codes',icon:'qr' as const,active:false},{label:'Phrase Library',icon:'files' as const,active:false},{label:'Activity',icon:'activity' as const,active:false}]
  const metrics = overview ? [
    { label: 'Total businesses', value: overview.metrics.totalBusinesses, icon: 'buildings' as const },
    { label: 'Active businesses', value: overview.metrics.activeBusinesses, icon: 'users' as const },
    { label: 'Business locations', value: overview.metrics.totalLocations, icon: 'location' as const },
    { label: 'QR codes', value: overview.metrics.totalQrCodes, icon: 'qr' as const }
  ] : []

  return <div className="shell">
    <button className={`backdrop ${drawer ? 'is-open' : ''}`} onClick={() => { setDrawer(false); menuRef.current?.focus() }} aria-label="Close navigation" tabIndex={drawer ? 0 : -1}/>
    <aside ref={sidebarRef} className={`sidebar ${drawer ? 'is-open' : ''}`} aria-label="Primary navigation" inert={mobile && !drawer}>
      <Brand/>
      <nav className="side-nav" aria-label="Main navigation"><p className="nav-group-title">WORKSPACE</p>{links.map(link => <button key={link.label} className={`nav-link ${link.active ? 'current' : 'admin-disabled'}`} aria-current={link.active ? 'page' : undefined} disabled={!link.active} onClick={() => setDrawer(false)}><Icon name={link.icon}/><span>{link.label}</span></button>)}</nav>
      <div className="sidebar-bottom"><div className="help-link"><Icon name="shield"/><span>Restricted operator access</span></div><div className="operator-mini"><div className="operator-badge">{initials(user.email)}</div><div><strong>{user.email.split('@')[0]}</strong><small>{user.role.replace('_',' ')}</small></div></div><button type="button" className="mobile-logout" disabled={loggingOut} onClick={logout}><Icon name="logout"/> {loggingOut ? 'Signing out…' : 'Sign out'}</button></div>
    </aside>
    <div className="workspace"><header className="topbar"><div className="topbar-left"><button ref={menuRef} className="menu-toggle" type="button" aria-label="Open navigation" aria-expanded={drawer} onClick={() => setDrawer(true)}><Icon name="menu"/></button><div className="crumb"><span className="crumb-first">Workspace</span><Icon name="chevron"/><span className="current-crumb">Overview</span></div></div><div className="topbar-right"><span className="topbar-note">AIBawaal · Super Admin</span><span className="topbar-divider"/><div className="user-pill"><span className="operator-badge">{initials(user.email)}</span><span className="operator-name">{user.email}</span></div></div></header>
      <main id="main" className="content"><div className="page-head"><div><p className="eyebrow">OPERATIONS OVERVIEW</p><h1>Overview</h1><p className="page-description">Your business and QR workspace at a glance.</p></div></div>
      {error && <div className="overview-note" role="alert">{error}</div>}
      {!error && loading && <div className="overview-note" role="status">Loading your workspace…</div>}
      {overview && <><div className="metrics">{metrics.map(metric => <section className="panel metric" key={metric.label}><div className="metric-top"><span className="metric-label">{metric.label}</span><span className="metric-symbol"><Icon name={metric.icon}/></span></div><div className="metric-value">{metric.value.toLocaleString()}</div><p className="metric-detail">Live database total</p></section>)}</div>
      <div className="overview-grid"><section className="panel"><header className="panel-head"><div><h2>Recently added businesses</h2><p className="intro">Latest records from your database</p></div></header>{overview.recentBusinesses.length ? <table className="data-table recent-table"><thead><tr><th>Business</th><th>Category</th><th>Status</th></tr></thead><tbody>{overview.recentBusinesses.map(business => <tr key={business.id}><td><div className="table-company"><span className="company-icon">{business.name.slice(0,2).toUpperCase()}</span><div><span className="company-name">{business.name}</span><span className="company-sub">{business.slug} · {date(business.createdAt)}</span></div></div></td><td>{business.category}</td><td><span className={`status ${business.status === 'active' ? '' : 'inactive'}`}>{business.status === 'active' ? 'Active' : 'Inactive'}</span></td></tr>)}</tbody></table> : <p className="admin-empty">No businesses have been added yet.</p>}</section>
      <section className="panel"><header className="panel-head"><div><h2>Recent activity</h2><p className="intro">Recorded administrative events</p></div></header>{overview.recentActivity.length ? <ul className="activity-list">{overview.recentActivity.map((activity, index) => <li key={index} className="activity-item"><span className="activity-icon"><Icon name="activity"/></span><div><p className="activity-text"><strong>{activity.action.replaceAll(/[._]/g, ' ')}</strong></p><span className="activity-time">{date(activity.createdAt)}</span></div></li>)}</ul> : <p className="admin-empty">No administrative activity has been recorded yet.</p>}</section></div>
      <div className="note-panel"><Icon name="shield"/><span><strong>Protected operator workspace.</strong> Business editing, QR management and phrase settings will be available in later phases.</span></div></>}
      <footer className="footer-note"><span>AIBawaal Super Admin</span><span>Authenticated operator access</span></footer></main>
    </div>
  </div>
}
