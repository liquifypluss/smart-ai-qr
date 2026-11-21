import { useCallback, useEffect, useRef, useState } from 'react'
import { adminApi, AdminApiError, type Operator, type Overview } from './api'
import { Brand, Icon } from './Icons'
import { Businesses } from './Businesses'
import { BusinessDetail } from './BusinessDetail'
import { PhraseLibrary, LibraryEditor } from './PhraseLibrary'
import { Activity } from './Activity'
import { Empty, Loading, Notice } from './ManagementField'

function date(value: string) { return new Date(value).toLocaleDateString(undefined, { day:'numeric',month:'short',year:'numeric' }) }
function initials(value: string) { return value.split('@')[0].split(/[._-]/).map(segment=>segment[0]||'').join('').slice(0,2).toUpperCase() || 'AB' }
type PageRoute = { page: 'overview' | 'businesses' | 'business' | 'phrases' | 'library' | 'activity'; id?: string }
function route(path: string): PageRoute {
  const match = path.match(/^\/(businesses|phrase-libraries)\/([0-9a-f-]{36})\/?$/i)
  if (match) return { page: match[1]==='businesses'?'business':'library', id:match[2] }
  if (path.startsWith('/businesses')) return { page:'businesses' }
  if (path.startsWith('/phrase-libraries')) return { page:'phrases' }
  if (path.startsWith('/activity')) return { page:'activity' }
  return { page:'overview' }
}
const destinations = [{label:'Overview',icon:'grid' as const,path:'/'},{label:'Businesses',icon:'buildings' as const,path:'/businesses'},{label:'Phrase Library',icon:'files' as const,path:'/phrase-libraries'},{label:'Activity',icon:'activity' as const,path:'/activity'}]
function title(page:PageRoute['page']){return page==='overview'?'Overview':page==='businesses'||page==='business'?'Businesses':page==='phrases'||page==='library'?'Phrase Library':'Activity'}

export function Dashboard({user,csrf,onExpired,onLogout}:{user:Operator;csrf:string;onExpired:()=>void;onLogout:()=>Promise<void>}){
  const [current,setCurrent] = useState<PageRoute>(()=>route(window.location.pathname))
  const [drawer,setDrawer]=useState(false),[mobile,setMobile]=useState(()=>window.matchMedia('(max-width: 1023px)').matches),[loggingOut,setLoggingOut]=useState(false),[error,setError]=useState('')
  const menuRef=useRef<HTMLButtonElement>(null), sidebarRef=useRef<HTMLElement>(null)
  const navigate=useCallback((path:string)=>{window.history.pushState({},'',path);setCurrent(route(path));setDrawer(false);window.scrollTo(0,0)},[])
  useEffect(()=>{const onPop=()=>setCurrent(route(window.location.pathname));window.addEventListener('popstate',onPop);return()=>window.removeEventListener('popstate',onPop)},[])
  useEffect(()=>{const media=window.matchMedia('(max-width: 1023px)');const update=()=>{setMobile(media.matches);if(!media.matches)setDrawer(false)};media.addEventListener('change',update);return()=>media.removeEventListener('change',update)},[])
  useEffect(()=>{if(!drawer)return;const sidebar=sidebarRef.current;sidebar?.querySelector<HTMLElement>('.nav-link')?.focus();const onKey=(event:KeyboardEvent)=>{
    if(event.key==='Escape'){setDrawer(false);menuRef.current?.focus()}
    if(event.key==='Tab'&&sidebar){const controls=[...sidebar.querySelectorAll<HTMLElement>('button:not(:disabled),a[href]')];if(!controls.length)return;if(event.shiftKey&&document.activeElement===controls[0]){event.preventDefault();controls.at(-1)?.focus()}else if(!event.shiftKey&&document.activeElement===controls.at(-1)){event.preventDefault();controls[0].focus()}}
  };document.addEventListener('keydown',onKey);return()=>document.removeEventListener('keydown',onKey)},[drawer])
  async function logout(){if(loggingOut)return;setLoggingOut(true);try{await onLogout()}catch{setError('Could not sign out. Please retry.');setLoggingOut(false)}}
  return <div className="shell"><a href="#main" className="skip">Skip to main content</a>
    <button className={`backdrop ${drawer?'is-open':''}`} onClick={()=>{setDrawer(false);menuRef.current?.focus()}} aria-label="Close navigation" tabIndex={drawer?0:-1}/>
    <aside ref={sidebarRef} className={`sidebar ${drawer?'is-open':''}`} aria-label="Primary navigation" inert={mobile&&!drawer}>
      <Brand/><nav className="side-nav" aria-label="Main navigation"><p className="nav-group-title">WORKSPACE</p>{destinations.map(link=>{
        const selected=current.page===route(link.path).page||(link.path==='/businesses'&&current.page==='business')||(link.path==='/phrase-libraries'&&current.page==='library')
        return <button type="button" key={link.path} className={`nav-link ${selected?'current':''}`} aria-current={selected?'page':undefined} onClick={()=>{navigate(link.path);if(mobile)menuRef.current?.focus()}}><Icon name={link.icon}/><span>{link.label}</span></button>
      })}</nav><div className="sidebar-bottom"><button type="button" className="mobile-logout" disabled={loggingOut} onClick={()=>void logout()}><Icon name="logout"/> {loggingOut?'Signing out…':'Sign out'}</button></div>
    </aside><div className="workspace"><header className="topbar"><div className="topbar-left"><button ref={menuRef} className="menu-toggle" type="button" aria-label="Open navigation" aria-expanded={drawer} onClick={()=>setDrawer(true)}><Icon name="menu"/></button><div className="crumb"><span className="crumb-first">Workspace</span><Icon name="chevron"/><span className="current-crumb">{title(current.page)}</span></div></div><div className="topbar-right"><div className="user-pill"><span className="operator-badge">{initials(user.email)}</span><span className="operator-name">{user.email}</span></div><button type="button" className="topbar-signout" disabled={loggingOut} onClick={()=>void logout()} aria-label="Sign out"><Icon name="logout"/></button></div></header>
      <main id="main" className="content" tabIndex={-1}>
        <Notice message={error} tone="error"/>
        {current.page==='overview'&&<OverviewPanel onExpired={onExpired} onBusiness={id=>navigate(`/businesses/${id}`)}/>}
        {current.page==='businesses'&&<Businesses csrf={csrf} onExpired={onExpired} onOpen={id=>navigate(`/businesses/${id}`)}/>}
        {current.page==='business'&&current.id&&<BusinessDetail id={current.id} csrf={csrf} onExpired={onExpired} onBack={()=>navigate('/businesses')} onLibrary={id=>navigate(`/phrase-libraries/${id}`)}/>}
        {current.page==='phrases'&&<PhraseLibrary csrf={csrf} onExpired={onExpired} onOpen={id=>navigate(`/phrase-libraries/${id}`)}/>}
        {current.page==='library'&&current.id&&<LibraryEditor id={current.id} csrf={csrf} onExpired={onExpired} onBack={()=>navigate('/phrase-libraries')}/>}
        {current.page==='activity'&&<Activity onExpired={onExpired}/>}
      </main></div></div>
}
function OverviewPanel({onExpired,onBusiness}:{onExpired:()=>void;onBusiness:(id:string)=>void}){
  const [overview,setOverview]=useState<Overview|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0)
  useEffect(()=>{let active=true;setLoading(true);adminApi.overview().then(value=>{if(active){setOverview(value);setError('')}}).catch(issue=>{if(!active)return;if(issue instanceof AdminApiError&&issue.status===401)onExpired();else setError('The overview could not be loaded.')}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[revision,onExpired])
  const metrics=overview?[{label:'Total businesses',value:overview.metrics.totalBusinesses,icon:'buildings' as const},{label:'Active businesses',value:overview.metrics.activeBusinesses,icon:'users' as const},{label:'Business locations',value:overview.metrics.totalLocations,icon:'location' as const},{label:'QR codes',value:overview.metrics.totalQrCodes,icon:'qr' as const}]:[]
  return <section className="management-page"><header className="page-head"><div><p className="eyebrow">BUSINESS OVERVIEW</p><h1>Overview</h1><p className="page-description">Your businesses and review setup at a glance.</p></div></header>{loading&&<Loading label="Loading overview…"/>}{error&&<><Notice message={error} tone="error"/><button className="btn btn-secondary" onClick={()=>setRevision(x=>x+1)}>Retry</button></>}
  {overview&&!loading&&<><div className="metrics">{metrics.map(metric=><section className="panel metric" key={metric.label}><div className="metric-top"><span className="metric-label">{metric.label}</span><span className="metric-symbol"><Icon name={metric.icon}/></span></div><div className="metric-value">{metric.value.toLocaleString()}</div></section>)}</div>
  <div className="overview-grid"><section className="panel"><header className="panel-head"><div><h2>Recently added businesses</h2><p className="intro">Latest business records</p></div></header>{overview.recentBusinesses.length?<table className="data-table recent-table"><thead><tr><th>Business</th><th>Category</th><th>Status</th></tr></thead><tbody>{overview.recentBusinesses.map(row=><tr key={row.id}><td><button className="business-row-link" onClick={()=>onBusiness(row.id)}><strong>{row.name}</strong><span>{row.slug} · {date(row.createdAt)}</span></button></td><td>{row.category}</td><td><span className={`status ${row.status==='active'?'':'inactive'}`}>{row.status==='active'?'Active':'Inactive'}</span></td></tr>)}</tbody></table>:<Empty>No businesses have been added yet.</Empty>}</section>
  <section className="panel"><header className="panel-head"><div><h2>Recent activity</h2><p className="intro">Recorded administrative changes</p></div></header>{overview.recentActivity.length?<ul className="activity-list">{overview.recentActivity.map((item,i)=><li className="activity-item" key={i}><span className="activity-icon"><Icon name="activity"/></span><div><p className="activity-text">{item.action.replaceAll(/[._]/g,' ')}</p><time className="activity-time" dateTime={item.createdAt}>{date(item.createdAt)}</time></div></li>)}</ul>:<Empty>No activity recorded yet.</Empty>}</section></div></>}
  </section>
}
