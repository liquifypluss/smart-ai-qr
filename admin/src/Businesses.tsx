import { useDeferredValue, useEffect, useState } from 'react'
import { AdminApiError } from './api'
import { managementApi, type BusinessRow, type Page } from './management-api'
import { ActionRow, Empty, Field, Loading, Notice, Pager, SelectField, Status, statusChoices } from './ManagementField'

const initial = { name: '', slug: '', category: '', primaryColor: '#0753dd', destinationUrl: '' }
export function Businesses({ csrf, onExpired, onOpen }: { csrf: string; onExpired: () => void; onOpen: (id: string) => void }) {
  const [rows, setRows] = useState<Page<BusinessRow> | null>(null)
  const [loading, setLoading] = useState(true), [notice, setNotice] = useState(''), [error, setError] = useState(''), [saving, setSaving] = useState(false)
  const [search, setSearch] = useState(''), deferred = useDeferredValue(search)
  const [status, setStatus] = useState(''), [category, setCategory] = useState(''), [page, setPage] = useState(1), [revision, setRevision] = useState(0)
  const [adding, setAdding] = useState(false), [form, setForm] = useState(initial)
  useEffect(() => {
    let active = true
    setLoading(true)
    managementApi.businesses({ q: deferred, status, category, page }).then(data => { if (active) { setRows(data); setError('') } }).catch(issue => {
      if (!active) return
      if (issue instanceof AdminApiError && issue.status === 401) onExpired()
      else setError('Businesses could not be loaded. Please retry.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [deferred, status, category, page, revision, onExpired])
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setNotice('')
    try {
      const item = await managementApi.createBusiness(csrf, { ...form, destinationUrl: form.destinationUrl.trim() || null })
      setAdding(false); setForm(initial); setRevision(x => x+1); onOpen(item.id)
    } catch (issue) { if (issue instanceof AdminApiError && issue.status === 401) onExpired(); else setNotice(issue instanceof AdminApiError && issue.status === 409 ? 'This business slug is already used.' : 'Business could not be created. Check the fields and try again.') }
    finally { setSaving(false) }
  }
  return <section className="management-page">
    <header className="page-head"><div><p className="eyebrow">BUSINESS MANAGEMENT</p><h1>Businesses</h1><p className="page-description">Manage business profiles, locations, review settings and QR codes.</p></div><button className="btn btn-primary" onClick={() => { setAdding(!adding); setNotice('') }}> {adding ? 'Cancel' : 'Add business'}</button></header>
    {adding && <form className="panel management-form" onSubmit={event => void create(event)}><h2>New business</h2><div className="management-fields">
      <Field label="Business name" required value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))}/>
      <Field label="Unique slug" required value={form.slug} onChange={v => setForm(f => ({ ...f, slug: v.toLowerCase().replace(/[^a-z0-9-]/g, '') }))} placeholder="sharma-mobile"/>
      <Field label="Industry/category" required value={form.category} onChange={v => setForm(f => ({ ...f, category: v.toLowerCase().replace(/[^a-z0-9-]/g, '') }))} placeholder="electronics"/>
      <Field label="Primary color" type="color" value={form.primaryColor} onChange={v => setForm(f => ({ ...f, primaryColor: v }))}/>
      <Field label="Review destination (HTTPS)" type="url" value={form.destinationUrl} onChange={v => setForm(f => ({ ...f, destinationUrl: v }))} placeholder="https://..."/>
    </div><ActionRow><button className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create business'}</button></ActionRow></form>}
    <Notice message={notice} tone="error"/>
    <section className="panel management-list"><div className="management-toolbar">
      <label className="management-search">Search businesses<input className="control" type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(1) }} placeholder="Search by business name"/></label>
      <SelectField label="Status" value={status} onChange={v => { setStatus(v); setPage(1) }} options={[{value:'',label:'All statuses'},...statusChoices]}/>
      <label className="management-field">Industry<input className="control" value={category} onChange={event => { setCategory(event.target.value); setPage(1) }} placeholder="All industries"/></label>
      <button className="btn btn-secondary" onClick={() => { setSearch(''); setStatus(''); setCategory(''); setPage(1) }}>Clear filters</button>
    </div>
    {error && <div className="management-error"><Notice message={error} tone="error"/><button className="btn btn-secondary" onClick={() => setRevision(x => x+1)}>Retry</button></div>}
    {loading ? <Loading label="Loading businesses…"/> : rows && !error && (rows.items.length ? <>
      <div className="management-table-scroll"><table className="data-table management-table"><thead><tr><th>Business</th><th>Industry</th><th>Slug</th><th>Locations</th><th>QR codes</th><th>Phrase libraries</th><th>Status</th><th>Created</th><th>Manage</th></tr></thead><tbody>{rows.items.map(row => <tr key={row.id}>
        <td><div className="table-company"><span className="company-icon">{row.logoId ? <img src={`${import.meta.env.VITE_PUBLIC_API_ORIGIN || 'https://api.smartqr.liquifyplus.in'}/api/v1/public/assets/${row.logoId}`} alt="" loading="lazy" onError={event => { event.currentTarget.style.display='none' }}/> : row.name.slice(0, 2).toUpperCase()}</span><div><span className="company-name">{row.name}</span></div></div></td>
        <td>{row.category}</td><td>{row.slug}</td><td>{row.locationCount}</td><td>{row.qrCount}</td><td className="phrase-cell">{row.libraries || 'Global defaults'}</td><td><Status active={row.status === 'active'}/></td><td>{new Date(row.createdAt).toLocaleDateString()}</td><td><button className="btn btn-secondary" onClick={() => onOpen(row.id)}>Manage</button></td>
      </tr>)}</tbody></table></div>
      <div className="management-mobile-rows">{rows.items.map(row => <button key={row.id} className="management-mobile-row" onClick={() => onOpen(row.id)}><strong>{row.name}</strong><span>{row.category} · {row.locationCount} locations · {row.qrCount} QR codes</span><span>{row.status === 'active' ? 'Active' : 'Inactive'} · {row.libraries || 'Global defaults'}</span></button>)}</div>
      <Pager page={rows.page} total={rows.total} limit={rows.limit} onChange={setPage}/></> : <Empty>No businesses match your current filters.</Empty>)}
    </section>
  </section>
}
