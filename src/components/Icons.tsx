import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

export function BagIcon(props: IconProps) {
  return <svg viewBox="0 0 44 50" role="img" aria-label="Shopping bag" {...props}>
    <defs><linearGradient id="bag-fill" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#4587fb"/><stop offset="1" stopColor="#0b49ba"/></linearGradient></defs>
    <path d="M12 15v-4a10 10 0 0 1 20 0v4" fill="none" stroke="#2565c9" strokeWidth="4" strokeLinecap="round" />
    <rect x="3" y="13" width="38" height="35" rx="5" fill="url(#bag-fill)" />
    <path d="M29.2 26.4a9.7 9.7 0 1 0 1 11.3v-9.2h-9.4v5h4.4a4.3 4.3 0 1 1-.6-4.7z" fill="#fff" />
  </svg>
}

export function PinIcon(props: IconProps) {
  return <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}><path d="M10 1.5a6.8 6.8 0 0 0-6.8 6.8c0 5 6.8 10.2 6.8 10.2s6.8-5.2 6.8-10.2A6.8 6.8 0 0 0 10 1.5Zm0 9.4a2.6 2.6 0 1 1 0-5.2 2.6 2.6 0 0 1 0 5.2Z" /></svg>
}

export function CheckIcon(props: IconProps) {
  return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d="m4 10 4 4 8-8" /></svg>
}

export function ArrowIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d="M4 12h16m-6-6 6 6-6 6" /></svg>
}

export function ChevronIcon(props: IconProps) {
  return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d="m7 4 6 6-6 6" /></svg>
}

export function RefreshIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 9a7.5 7.5 0 0 1 13-2L20 12M4 12l1.5 5a7.5 7.5 0 0 0 13-2" /></svg>
}

export function LanguageIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-3 3-4.5 6-4.5 9s1.5 6 4.5 9c3-3 4.5-6 4.5-9S15 6 12 3Z"/></svg>
}

export function GoogleIcon(props: IconProps) {
  return <svg viewBox="0 0 28 28" role="img" aria-label="Google" {...props}>
    <circle cx="14" cy="14" r="13.3" fill="#fff" />
    <path d="M14 6.6a7.3 7.3 0 0 1 5.1 1.9l2.6-2.6A11 11 0 0 0 4.6 9.8l3.1 2.4A7.4 7.4 0 0 1 14 6.6Z" fill="#ea4335" />
    <path d="M6.6 14c0-.6.1-1.2.2-1.8L3.7 9.8a11 11 0 0 0 0 8.4l3.2-2.5c-.2-.5-.3-1.1-.3-1.7Z" fill="#fbbc05" />
    <path d="M14 21.4a7.3 7.3 0 0 1-6.3-3.7l-3.1 2.5A11 11 0 0 0 14 25a10.5 10.5 0 0 0 7.5-2.9L18.6 20a7.2 7.2 0 0 1-4.6 1.4Z" fill="#34a853" />
    <path d="M24.8 14c0-.7 0-1.4-.2-2.1H14v3.9h6.1a5.3 5.3 0 0 1-1.5 4.2l2.9 2.1a10.8 10.8 0 0 0 3.3-8.1Z" fill="#4285f4" />
  </svg>
}
export function WhatsAppIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
}
