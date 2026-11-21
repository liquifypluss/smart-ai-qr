import { useMemo, useRef, useState } from 'react'
import QRCode from 'qrcode'
import type { QrRecord } from './management-api'

const origin = (import.meta.env.VITE_CUSTOMER_ORIGIN ?? 'https://smartqr.liquifyplus.in').replace(/\/$/, '')
export const qrPublicUrl = (publicId: string) => `${origin}/q/${encodeURIComponent(publicId)}`
export type QrTemplate = QrRecord['template']
const templates: { id: QrTemplate; title: string; description: string }[] = [
  { id: 'signature', title: 'Signature', description: 'AIBawaal navy and bold framing' },
  { id: 'minimal', title: 'Minimal', description: 'Clean, compact and print-ready' },
  { id: 'business', title: 'Business Branded', description: 'Business identity, powered by AIBawaal' }
]
function contrast(color: string): number {
  const channels = [1, 3, 5].map(offset => parseInt(color.slice(offset, offset + 2), 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
  return 1.05 / (0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2] + .05)
}
function matrix(url: string): string {
  const qr = QRCode.create(url, { errorCorrectionLevel: 'H' })
  const size = qr.modules.size
  const unit = 560 / (size + 8)
  let result = ''
  for (let row = 0; row < size; row++) for (let col = 0; col < size; col++) {
    if (!qr.modules.get(row, col)) continue
    result += `M${((col + 4) * unit).toFixed(3)} ${((row + 4) * unit).toFixed(3)}h${unit.toFixed(3)}v${unit.toFixed(3)}h-${unit.toFixed(3)}z`
  }
  return result
}

function QrArtwork({ url, business, template, color }: { url: string; business: string; template: QrTemplate; color: string }) {
  const path = useMemo(() => matrix(url), [url])
  const accent = template === 'minimal' ? '#111827' : template === 'business' && /^#[a-f\d]{6}$/i.test(color) && contrast(color) >= 7 ? color : '#0F172A'
  return <svg className="branded-qr-svg" viewBox="0 0 720 850" xmlns="http://www.w3.org/2000/svg" role="img" aria-label={`${template} QR code for ${business}, leading to ${url}`}>
    <rect width="720" height="850" rx="18" fill="#fff"/>
    {template !== 'minimal' && <><rect width="720" height="100" fill={accent}/><text x="40" y="62" fill="#fff" fontSize="30" fontFamily="Arial,sans-serif" fontWeight="700">AIBawaal</text><text x="678" y="61" textAnchor="end" fill="#fff" fontSize="16" fontFamily="Arial,sans-serif">SMART AI QR</text></>}
    {template === 'minimal' && <text x="360" y="64" textAnchor="middle" fill={accent} fontSize="26" fontFamily="Arial,sans-serif" fontWeight="700">AIBawaal</text>}
    <text x="360" y="140" textAnchor="middle" fill="#0F172A" fontSize="26" fontWeight="700" fontFamily="Arial,sans-serif">Scan to Review</text>
    <svg x="80" y="165" width="560" height="560" viewBox="0 0 560 560"><rect width="560" height="560" fill="white"/><path d={path} fill={accent}/></svg>
    <text x="360" y="767" fill="#0F172A" fontSize="22" fontWeight="600" textAnchor="middle" fontFamily="Arial,sans-serif">{business.slice(0, 44)}</text>
    <text x="360" y="812" fill="#475569" fontSize="15" textAnchor="middle" fontFamily="Arial,sans-serif">{template === 'business' ? 'Powered by AIBawaal' : 'AIBawaal · Customer reviews'}</text>
  </svg>
}

export function QrDesigner({ qr, business, color, onTemplate }: { qr: QrRecord; business: string; color: string; onTemplate: (value: QrTemplate) => Promise<void> }) {
  const [template, setTemplate] = useState<QrTemplate>(qr.template)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const art = useRef<HTMLDivElement>(null)
  const url = qrPublicUrl(qr.publicId)
  async function update(value: QrTemplate) {
    setSaving(true)
    try { await onTemplate(value); setTemplate(value); setMessage('Template saved') }
    catch { setMessage('Could not save the selected template') }
    finally { setSaving(false) }
  }
  function download(extension: 'svg' | 'png') {
    const svg = art.current?.querySelector('svg')
    if (!svg) return
    const xml = new XMLSerializer().serializeToString(svg)
    const save = (blob: Blob) => { const uri = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = uri; link.download = `aibawaal-${qr.publicId}.${extension}`; link.click(); URL.revokeObjectURL(uri) }
    if (extension === 'svg') { save(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' })); return }
    const encoded = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }), uri = URL.createObjectURL(encoded), image = new Image()
    image.onload = () => { const canvas = document.createElement('canvas'); canvas.width = 2160; canvas.height = 2550; const ctx = canvas.getContext('2d'); if (ctx) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(image, 0, 0, canvas.width, canvas.height); canvas.toBlob(blob => { if (blob) save(blob) }, 'image/png') } URL.revokeObjectURL(uri) }
    image.onerror = () => { URL.revokeObjectURL(uri); setMessage('PNG export failed. Download SVG instead.') }
    image.src = uri
  }
  return <div className="qr-designer">
    <div className="qr-options" role="group" aria-label="Choose QR template">
      {templates.map(option => <button type="button" key={option.id} className={`qr-option ${template === option.id ? 'selected' : ''}`} aria-pressed={template === option.id} disabled={saving} onClick={() => void update(option.id)}><strong>{option.title}</strong><span>{option.description}</span></button>)}
    </div>
    <div ref={art} className="qr-art-preview"><QrArtwork url={url} business={business} template={template} color={color}/></div>
    <div className="management-actions"><button className="btn btn-secondary" onClick={() => download('svg')}>Download SVG</button><button className="btn btn-secondary" onClick={() => download('png')}>Download PNG</button><button className="btn btn-secondary" onClick={() => void navigator.clipboard.writeText(url).then(() => setMessage('Link copied')).catch(() => setMessage('Could not copy link'))}>Copy link</button></div>
    <p className="muted-text" aria-live="polite">{message || url}</p>
  </div>
}
