import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { AdminApiError } from './api'
import { managementApi, type BusinessDetail as Detail, type LibraryRow, type Location, type Choice, type QrRecord } from './management-api'
import { ActionRow, Empty, Field, Loading, Notice, SelectField, Status, statusChoices } from './ManagementField'
import { QrDesigner, type QrTemplate, qrPublicUrl } from './QrDesigner'

const tabs = ['Overview', 'Locations', 'QR Codes', 'Review Settings', 'Phrase Libraries', 'Assets'] as const
type Tab = typeof tabs[number]
const languageOptions = [{code:'en',label:'English'},{code:'hi',label:'Hindi'},{code:'hinglish',label:'Hinglish'}] as const
const publicAsset = (id: string) => `${import.meta.env.VITE_PUBLIC_API_ORIGIN || 'https://api.smartqr.liquifyplus.in'}/api/v1/public/assets/${id}`

export function BusinessDetail({ id, csrf, onExpired, onBack, onLibrary }: { id: string; csrf: string; onExpired: () => void; onBack: () => void; onLibrary: (id: string) => void }) {
  const [data, setData] = useState<Detail | null>(null), [revision, setRevision] = useState(0), [loading, setLoading] = useState(true), [error, setError] = useState(''), [notice, setNotice] = useState(''), [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<Tab>('Overview')
  useEffect(() => { let active = true; setLoading(true)
    managementApi.business(id).then(value => { if (active) { setData(value); setError('') } }).catch(issue => { if (!active) return; if (issue instanceof AdminApiError && issue.status === 401) onExpired(); else setError('Business could not be loaded.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id, revision, onExpired])
  async function apply(action: () => Promise<unknown>, success: string) {
    setSaving(true); setNotice('')
    try { await action(); setNotice(success); setRevision(x => x+1) }
    catch (issue) { if (issue instanceof AdminApiError && issue.status === 401) onExpired(); else setNotice(issue instanceof AdminApiError && issue.status === 409 ? 'This value already exists or conflicts with another record.' : 'Could not save. Check your changes and try again.') }
    finally { setSaving(false) }
  }
  return <section className="management-page"><div className="page-head"><div><button className="text-back" onClick={onBack}>Businesses /</button><h1>{data?.business.name || 'Business details'}</h1><p className="page-description">Manage this business and its review experience.</p></div>{data && <a className="btn btn-secondary" href={`https://smartqr.liquifyplus.in/b/${encodeURIComponent(data.business.slug)}`} target="_blank" rel="noreferrer">Preview public page</a>}</div>
    {loading && <Loading label="Loading business details…"/>}
    {error && <><Notice message={error} tone="error"/><button className="btn btn-secondary" onClick={() => setRevision(x => x+1)}>Retry</button></>}
    {data && !loading && <>
      <div className="detail-tabs" role="tablist" aria-label="Business management sections">{tabs.map(option => <button role="tab" key={option} aria-selected={tab===option} className={tab===option?'selected':''} onClick={() => { setTab(option); setNotice('') }}>{option}</button>)}</div>
      <Notice message={notice} tone={notice.startsWith('Could not') || notice.startsWith('This value') ? 'error' : 'success'}/>
      {tab === 'Overview' && <BusinessGeneral detail={data} saving={saving} apply={apply} csrf={csrf}/>}
      {tab === 'Locations' && <BusinessLocations data={data} saving={saving} apply={apply} csrf={csrf}/>}
      {tab === 'QR Codes' && <BusinessQr data={data} saving={saving} apply={apply} csrf={csrf}/>}
      {tab === 'Review Settings' && <BusinessReview data={data} saving={saving} apply={apply} csrf={csrf}/>}
      {tab === 'Phrase Libraries' && <BusinessLibraries data={data} saving={saving} apply={apply} csrf={csrf} onLibrary={onLibrary}/>}
      {tab === 'Assets' && <BusinessAssets data={data} saving={saving} apply={apply} csrf={csrf}/>}
    </>}
  </section>
}
type Props = { data: Detail; csrf: string; saving: boolean; apply: (action: () => Promise<unknown>, success: string) => Promise<void> }
function BusinessGeneral({ detail, csrf, saving, apply }: {detail:Detail} & Omit<Props,'data'>) {
  const [form, setForm] = useState({ name: detail.business.name, slug: detail.business.slug, category: detail.business.category, primaryColor: detail.business.primaryColor, status: detail.business.status, destinationUrl: detail.business.destinationUrl || '' })
  const update = (name: keyof typeof form, value: string) => setForm(current => ({ ...current, [name]: value }))
  const save = (event: FormEvent) => { event.preventDefault(); void apply(() => managementApi.updateBusiness(csrf, detail.business.id, { ...form, destinationUrl: form.destinationUrl || null }), 'Business saved') }
  return <form className="panel management-form" onSubmit={save}><h2>Business profile</h2><div className="management-fields">
    <Field label="Business name" value={form.name} required onChange={v => update('name',v)}/><Field label="Unique slug" value={form.slug} required onChange={v => update('slug',v)}/>
    <Field label="Industry/category" value={form.category} required onChange={v => update('category',v)}/><Field label="Primary color" value={form.primaryColor} type="color" onChange={v => update('primaryColor',v)}/>
    <Field label="Review destination (HTTPS)" value={form.destinationUrl} type="url" onChange={v => update('destinationUrl',v)} placeholder="https://..."/>
    <SelectField label="Business status" value={form.status} onChange={v => update('status',v)} options={statusChoices}/>
  </div><ActionRow><button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save business'}</button></ActionRow></form>
}
const newLocation = { code: '', name: '', displayAddress: '', city: '', region: '', country: '', destinationUrl: '', isPrimary: false, status: 'active' }
function BusinessLocations({ data, csrf, saving, apply }: Props) {
  const [adding, setAdding] = useState(false), [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState(newLocation)
  function startEdit(row: Location) { setForm({ code: row.code, name: row.name, displayAddress: row.displayAddress, city: row.city ?? '', region: row.region ?? '', country: row.country ?? '', destinationUrl: row.destinationUrl ?? '', isPrimary: row.isPrimary, status: row.status }); setEditing(row.id); setAdding(true) }
  function create(event: FormEvent) { event.preventDefault(); void apply(() => editing ? managementApi.updateLocation(csrf,data.business.id,editing,{ ...form,destinationUrl:form.destinationUrl||null }) : managementApi.createLocation(csrf,data.business.id,{ ...form,destinationUrl:form.destinationUrl||null }), editing ? 'Location saved' : 'Location created').then(() => { setAdding(false);setEditing(null);setForm(newLocation) }) }
  return <div className="panel management-form"><div className="management-panel-head"><h2>Locations</h2><button className="btn btn-secondary" onClick={() => { setForm(newLocation);setEditing(null);setAdding(!adding) }}>{adding ? 'Cancel' : 'Add location'}</button></div>
    {adding && <form onSubmit={create} className="subform"><div className="management-fields">
      <Field label="Location code" value={form.code} required onChange={v => setForm(s => ({...s,code:v}))}/><Field label="Location name" value={form.name} required onChange={v => setForm(s => ({...s,name:v}))}/><Field label="Display address" value={form.displayAddress} required onChange={v => setForm(s => ({...s,displayAddress:v}))}/>
      <Field label="City" value={form.city} onChange={v => setForm(s => ({...s,city:v}))}/><Field label="Region" value={form.region} onChange={v => setForm(s => ({...s,region:v}))}/><Field label="Country" value={form.country} onChange={v => setForm(s => ({...s,country:v}))}/>
      <Field label="Review destination (HTTPS)" type="url" value={form.destinationUrl} onChange={v => setForm(s => ({...s,destinationUrl:v}))}/>
      <SelectField label="Status" value={form.status} onChange={v => setForm(s => ({...s,status:v}))} options={statusChoices}/>
    </div><label className="management-check"><input type="checkbox" checked={form.isPrimary} onChange={e => setForm(s => ({...s,isPrimary:e.target.checked}))}/> Primary location</label><ActionRow><button className="btn btn-primary" disabled={saving}>{saving?'Saving…':editing?'Save location':'Create location'}</button></ActionRow></form>}
    {data.locations.length ? <div className="management-stack">{data.locations.map(location => <div className="record-row" key={location.id}><div><strong>{location.name}</strong><p>{location.displayAddress}</p><small>{location.code} {location.isPrimary ? '· Primary' : ''}</small></div><Status active={location.status==='active'}/><button className="btn btn-secondary" onClick={() => startEdit(location)}>Edit</button></div>)}</div> : <Empty>No locations yet. Add your first business location.</Empty>}
  </div>
}
function BusinessQr({ data, csrf, saving, apply }: Props) {
  const [label,setLabel] = useState(''), [locationId,setLocationId] = useState(''), [template,setTemplate] = useState<QrTemplate>('signature'), [selected,setSelected] = useState<string | null>(null)
  const selectedQr = data.qrCodes.find(qr => qr.id === selected)
  return <div className="management-stack"><form className="panel management-form" onSubmit={event => {event.preventDefault();void apply(()=>managementApi.createQr(csrf,data.business.id,{label,locationId:locationId||null,template}),'QR code created').then(()=>setLabel(''))}}><h2>New QR code</h2><div className="management-fields"><Field label="QR label" value={label} onChange={setLabel} placeholder="Main store"/><SelectField label="Business location" value={locationId} onChange={setLocationId} options={[{value:'',label:'Entire business'},...data.locations.map(row=>({value:row.id,label:row.name}))]}/><SelectField label="QR design" value={template} onChange={v=>setTemplate(v as QrTemplate)} options={[{value:'signature',label:'Signature'},{value:'minimal',label:'Minimal'},{value:'business',label:'Business Branded'}]}/></div><ActionRow><button className="btn btn-primary" disabled={saving}>{saving?'Creating…':'Generate QR code'}</button></ActionRow></form>
    <section className="panel management-form"><h2>Business QR codes</h2>{!data.qrCodes.length ? <Empty>No QR codes created yet.</Empty> : <div className="management-stack">{data.qrCodes.map(qr => <div className="record-row" key={qr.id}><div><strong>{qr.label || 'Untitled QR code'}</strong><p className="long-token">{qrPublicUrl(qr.publicId)}</p><small>{data.locations.find(l=>l.id===qr.locationId)?.name||'Entire business'}</small></div><Status active={qr.status==='active'}/><ActionRow><button className="btn btn-secondary" onClick={()=>setSelected(selected===qr.id?null:qr.id)}>{selected===qr.id?'Close preview':'Preview'}</button><button className="btn btn-secondary" disabled={saving} onClick={()=>{if(window.confirm(`${qr.status==='active'?'Deactivate':'Activate'} this QR code?`))void apply(()=>managementApi.updateQr(csrf,data.business.id,qr.id,{status:qr.status==='active'?'inactive':'active'}),'QR status saved')}}>{qr.status==='active'?'Deactivate':'Activate'}</button></ActionRow></div>)}</div>}
    {selectedQr && <QrDesigner key={selectedQr.id} qr={selectedQr} business={data.business.name} color={data.business.primaryColor} onTemplate={value=>managementApi.updateQr(csrf,data.business.id,selectedQr.id,{template:value}).then(()=>{})}/>}</section>
  </div>
}
const freshChoice = { code: '', label: '', reviewLabel: '', wordmark: '', sortOrder: 0, status: 'active' }
function BusinessReview({ data, csrf, saving, apply }: Props) {
  const [choiceTitle,setChoiceTitle] = useState(data.settings?.choiceTitle||'What stood out?'), [languages,setLanguages] = useState(data.settings?.languages||['en','hi','hinglish'])
  const [editing,setEditing] = useState<string | null>(null), [form,setForm] = useState(freshChoice), [adding,setAdding] = useState(false)
  function edit(row: Choice) { setEditing(row.id);setForm({code:row.code,label:row.label,reviewLabel:row.reviewLabel,wordmark:row.wordmark||'',sortOrder:row.sortOrder,status:row.status});setAdding(true) }
  return <div className="management-stack"><form className="panel management-form" onSubmit={e=>{e.preventDefault();void apply(()=>managementApi.updateSettings(csrf,data.business.id,{choiceTitle,languages}),'Review settings saved')}}><h2>Review settings</h2><div className="management-fields"><Field label="Choice prompt" value={choiceTitle} onChange={setChoiceTitle} required/></div><fieldset className="language-fieldset"><legend>Enabled languages</legend>{languageOptions.map(lang=><label key={lang.code} className="management-check"><input type="checkbox" checked={languages.includes(lang.code)} onChange={e=>setLanguages(current=>e.target.checked?[...current,lang.code]:current.filter(v=>v!==lang.code))}/>{lang.label}</label>)}</fieldset><ActionRow><button className="btn btn-primary" disabled={saving||!languages.length}>Save review settings</button></ActionRow></form>
    <section className="panel management-form"><div className="management-panel-head"><h2>Business choices</h2><button className="btn btn-secondary" onClick={()=>{setAdding(!adding);setEditing(null);setForm(freshChoice)}}>{adding?'Cancel':'Add choice'}</button></div>
      {adding && <form className="subform" onSubmit={e=>{e.preventDefault();void apply(()=>editing?managementApi.updateChoice(csrf,data.business.id,editing,form):managementApi.createChoice(csrf,data.business.id,form),'Choice saved').then(()=>{setAdding(false);setEditing(null)})}}><div className="management-fields"><Field label="Choice code" value={form.code} onChange={v=>setForm(f=>({...f,code:v}))} required/><Field label="Display label" value={form.label} onChange={v=>setForm(f=>({...f,label:v}))} required/><Field label="Review phrase label" value={form.reviewLabel} onChange={v=>setForm(f=>({...f,reviewLabel:v}))} required/><Field label="Wordmark (optional)" value={form.wordmark} onChange={v=>setForm(f=>({...f,wordmark:v}))}/><label className="management-field">Sort order<input type="number" min="0" className="control" value={form.sortOrder} onChange={e=>setForm(f=>({...f,sortOrder:Number(e.target.value)}))}/></label><SelectField label="Choice status" value={form.status} onChange={v=>setForm(f=>({...f,status:v}))} options={statusChoices}/></div><ActionRow><button className="btn btn-primary" disabled={saving}>Save choice</button></ActionRow></form>}
      {data.choices.length?<div className="management-stack">{data.choices.map(choice=><div className="record-row" key={choice.id}><div><strong>{choice.label}</strong><p>{choice.reviewLabel} · {choice.code}</p></div><Status active={choice.status==='active'}/><button className="btn btn-secondary" onClick={()=>edit(choice)}>Edit</button></div>)}</div>:<Empty>No options are configured. Customers can still generate reviews without selections.</Empty>}
    </section></div>
}
function BusinessLibraries({ data, csrf, saving, apply, onLibrary }: Props & { onLibrary: (id: string)=>void }) {
  const [available,setAvailable] = useState<LibraryRow[]>([]), [search,setSearch]=useState(''), [selected,setSelected]=useState(''), [priority,setPriority]=useState(100), [isDefault,setDefault]=useState(false)
  useEffect(()=>{let active=true; managementApi.libraries({q:search,status:'active'}).then(list=>{if(active)setAvailable(list.items)}).catch(()=>{});return()=>{active=false}},[search])
  return <div className="management-stack"><section className="panel management-form"><h2>Assigned phrase libraries</h2>{data.assignedLibraries.length ? <div className="management-stack">{data.assignedLibraries.map(item=><div className="record-row" key={item.id}><div><button className="text-back" onClick={()=>onLibrary(item.id)}>{item.name}</button><p>Priority {item.priority} · {item.isDefault?'Default':'Additional'} · {item.status}</p></div><button className="btn btn-secondary" disabled={saving} onClick={()=>{if(window.confirm(`Unassign ${item.name}? Its phrases will not be deleted.`))void apply(()=>managementApi.unassignLibrary(csrf,data.business.id,item.id),'Library unassigned')}}>Unassign</button></div>)}</div> : <Empty>No shared libraries assigned. Existing industry/global phrases still apply.</Empty>}
    </section><form className="panel management-form" onSubmit={e=>{e.preventDefault();if(selected)void apply(()=>managementApi.assignLibrary(csrf,data.business.id,{libraryId:selected,priority,isDefault}),'Library assigned')}}><h2>Assign a library</h2><div className="management-fields"><Field label="Find library" value={search} onChange={setSearch} placeholder="Search library name"/><SelectField label="Available library" value={selected} onChange={setSelected} options={[{value:'',label:'Select an active library'},...available.filter(item=>(!item.ownerBusinessId||item.ownerBusinessId===data.business.id)&&(!item.industry||item.industry===data.business.category)).map(item=>({value:item.id,label:item.name}))]}/><label className="management-field">Priority<input className="control" type="number" min="0" max="1000" value={priority} onChange={e=>setPriority(Number(e.target.value))}/></label></div><label className="management-check"><input type="checkbox" checked={isDefault} onChange={e=>setDefault(e.target.checked)}/> Set as default library</label><ActionRow><button className="btn btn-primary" disabled={saving||!selected}>Assign library</button></ActionRow></form>
    <ReviewPreview businessId={data.business.id} choices={data.choices} />
  </div>
}
function ReviewPreview({businessId,choices}:{businessId:string;choices:Choice[]}) {
  const [language,setLanguage]=useState('en'),[rating,setRating]=useState(5),[choiceId,setChoiceId]=useState(''),[text,setText]=useState(''),[loading,setLoading]=useState(false),[error,setError]=useState('')
  async function preview(){setLoading(true);setError('');try{const result=await managementApi.preview(businessId,{language,rating,choiceId:choiceId||undefined});setText(result.text)}catch{setError('Preview unavailable. Check your phrase configuration.')}finally{setLoading(false)}}
  return <section className="panel management-form"><h2>Review preview</h2><div className="management-fields"><SelectField label="Preview language" value={language} onChange={setLanguage} options={languageOptions.map(x=>({value:x.code,label:x.label}))}/><SelectField label="Preview rating" value={String(rating)} onChange={v=>setRating(Number(v))} options={[0,1,2,3,4,5].map(r=>({value:String(r),label:r===0?'Unrated':`${r} stars`}))}/><SelectField label="Preview choice" value={choiceId} onChange={setChoiceId} options={[{value:'',label:'No selection'},...choices.map(choice=>({value:choice.code,label:choice.label}))]}/></div><ActionRow><button className="btn btn-primary" disabled={loading} onClick={()=>void preview()}>{loading?'Generating…':'Generate preview'}</button></ActionRow><Notice message={error} tone="error"/>{text&&<output className="review-preview-output">{text}</output>}</section>
}
function BusinessAssets({data,csrf,saving,apply}:Props) {
  const [kind,setKind]=useState('logo'),[choiceId,setChoiceId]=useState(''),[file,setFile]=useState<File|null>(null)
  return <section className="panel management-form"><h2>Business images</h2><p className="intro">Upload JPEG, PNG or WebP. Files are normalized to WebP and stored on the configured persistent volume.</p><form onSubmit={e=>{e.preventDefault();if(file)void apply(()=>managementApi.uploadAsset(csrf,data.business.id,kind,file,kind.startsWith('choice_')?choiceId:undefined),'Image uploaded').then(()=>setFile(null))}}><div className="management-fields"><SelectField label="Image type" value={kind} onChange={setKind} options={[{value:'logo',label:'Business logo'},{value:'header_image',label:'Cover/header image'},{value:'choice_image',label:'Choice image'},{value:'choice_logo',label:'Choice logo'}]}/>{kind.startsWith('choice_')&&<SelectField label="For choice" value={choiceId} onChange={setChoiceId} options={[{value:'',label:'Choose a selection'},...data.choices.map(choice=>({value:choice.id,label:choice.label}))]}/>}<label className="management-field">Choose image<input type="file" accept="image/jpeg,image/png,image/webp" required onChange={e=>setFile(e.target.files?.[0]||null)}/></label></div><ActionRow><button className="btn btn-primary" disabled={saving||!file||(kind.startsWith('choice_')&&!choiceId)}>Upload image</button></ActionRow></form>
    <div className="asset-gallery">{data.assets.map(asset=><div className="asset-entry" key={asset.id}><img src={publicAsset(asset.id)} alt={`${asset.kind} for ${data.business.name}`} loading="lazy"/><span>{asset.kind.replaceAll('_',' ')}</span></div>)}</div>{!data.assets.length&&<Empty>No images uploaded yet.</Empty>}
  </section>
}
