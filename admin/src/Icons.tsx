import type { ReactNode } from 'react'

type IconName = 'shield' | 'lock' | 'mail' | 'eye' | 'eye-off' | 'arrow' | 'menu' | 'close' | 'grid' | 'buildings' | 'qr' | 'files' | 'activity' | 'logout' | 'chevron' | 'help' | 'users' | 'location'

const paths: Record<IconName, ReactNode> = {
  shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 11 2 2 4-4"/></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 7 9-7"/></>,
  eye: <><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6Z"/><circle cx="12" cy="12" r="3"/></>,
  'eye-off': <><path d="M3 3l18 18M10.4 6.1A11 11 0 0 1 12 6c6 0 10 6 10 6a18.8 18.8 0 0 1-3.2 3.5M6.4 6.6C3.4 8.5 2 12 2 12s4 6 10 6c1.8 0 3.4-.5 4.7-1.2"/></>,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6"/>,
  menu: <path d="M4 6h16M4 12h16M4 18h16"/>,
  close: <path d="M5 5l14 14M19 5 5 19"/>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  buildings: <><rect x="4" y="4" width="11" height="17" rx="1.6"/><path d="M15 10h5v11H4m4-13v2m4-2v2M8 14h4m-4 4h4m6-5v2m0 3v1"/></>,
  qr: <><rect x="3" y="3" width="7" height="7" rx=".5"/><rect x="14" y="3" width="7" height="7" rx=".5"/><rect x="3" y="14" width="7" height="7" rx=".5"/><path d="M15 15h2v2h-2zM20 14v3m-4 4h5m0-2v2"/></>,
  files: <><rect x="6" y="3" width="12" height="18" rx="1.5"/><path d="M9 8h6M9 12h6M9 16h4"/></>,
  activity: <path d="M3 12h4l3-6 4 12 3-6h4"/>,
  logout: <path d="M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5m4-4 5-5-5-5m5 5H9"/>,
  chevron: <path d="m9 18 6-6-6-6"/>,
  help: <><circle cx="12" cy="12" r="9"/><path d="M9.6 9a2.7 2.7 0 1 1 4.8 1.7c-.7.7-2.4 1.4-2.4 3M12 17h.01"/></>,
  users: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2H3M17 6a3 3 0 0 1 0 6m1 4c2 0 3 2 3 4"/></>,
  location: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>
}

export function Icon({ name, className = 'icon' }: { name: IconName; className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

export function Brand() {
  return <div className="brand"><span className="brand-mark"><svg viewBox="0 0 24 24" aria-hidden="true" width="23" height="23" fill="none"><path d="M3 19 10 5h4l7 14M7 14h10" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round"/></svg></span><span><span className="brand-title" style={{ display: 'block' }}>AIBawaal</span><span className="brand-sub" style={{ display: 'block' }}>SUPER ADMIN</span></span></div>
}
