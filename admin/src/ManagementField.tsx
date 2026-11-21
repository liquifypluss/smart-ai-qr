import type { ReactNode } from 'react'

export function Field({ label, value, onChange, required, type = 'text', placeholder, maxLength, disabled }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: 'text' | 'url' | 'email' | 'color'; placeholder?: string; maxLength?: number; disabled?: boolean }) {
  const id = `field-${label.toLowerCase().replace(/\W+/g, '-')}`
  return <label className="management-field" htmlFor={id}><span>{label}{required && ' *'}</span><input id={id} className="control" type={type} required={required} disabled={disabled} maxLength={maxLength} placeholder={placeholder} value={value} onChange={event => onChange(event.target.value)} /></label>
}
export function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  const id = `select-${label.toLowerCase().replace(/\W+/g, '-')}`
  return <label className="management-field" htmlFor={id}><span>{label}</span><select id={id} className="control" value={value} onChange={event => onChange(event.target.value)}>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
}
export const statusChoices = [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]
export function ActionRow({ children }: { children: ReactNode }) { return <div className="management-actions">{children}</div> }
export function Notice({ message, tone = 'info' }: { message: string; tone?: 'info' | 'error' | 'success' }) { return message ? <div className={`management-notice ${tone}`} role={tone === 'error' ? 'alert' : 'status'}>{message}</div> : null }
export function Loading({ label = 'Loading…' }: { label?: string }) { return <div className="management-loading" role="status">{label}</div> }
export function Empty({ children }: { children: ReactNode }) { return <p className="admin-empty">{children}</p> }
export function Status({ active }: { active: boolean }) { return <span className={`status ${active ? '' : 'inactive'}`}>{active ? 'Active' : 'Inactive'}</span> }
export function Pager({ page, total, limit, onChange }: { page: number; total: number; limit: number; onChange: (next: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(total / limit))
  return <div className="management-pager"><span>{total.toLocaleString()} records · Page {page} of {totalPages}</span><div><button className="btn btn-secondary" disabled={page <= 1} onClick={() => onChange(page-1)}>Previous</button><button className="btn btn-secondary" disabled={page >= totalPages} onClick={() => onChange(page+1)}>Next</button></div></div>
}
