import type { Choice } from '../config/business'

type PhoneArtProps = { choice: Choice }

const shades: Record<NonNullable<Choice['art']>, [string, string, string]> = {
  silver: ['#c4cad2', '#e0e6e9', '#5c3479'],
  violet: ['#33314e', '#7b70aa', '#6c51c6'],
  blue: ['#81bae7', '#bad6f5', '#0f9dff'],
  green: ['#8fbaaa', '#244f41', '#257566'],
  lavender: ['#c2b7df', '#7b65ac', '#a342e6'],
  graphite: ['#40464e', '#151a24', '#566cb6'],
  gold: ['#d7c29a', '#7e6753', '#b8aa81'],
  charcoal: ['#5c656f', '#1b2330', '#91a1c6'],
  mint: ['#b5d6ce', '#7caca5', '#5ad1c4']
}

export function PhoneArt({ choice }: PhoneArtProps) {
  const [back, edge, screen] = shades[choice.art ?? 'silver']
  const id = choice.id
  return <svg className="phone-art" viewBox="0 0 98 79" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={`back-${id}`} x1="0" x2="1" y1="0" y2="1"><stop stopColor={back}/><stop offset="1" stopColor={edge}/></linearGradient>
      <linearGradient id={`screen-${id}`} x1="0" x2=".8" y1="0" y2="1"><stop stopColor="#1d1b3e"/><stop offset=".34" stopColor={screen}/><stop offset=".75" stopColor="#c4d2ee"/><stop offset="1" stopColor="#1b244b"/></linearGradient>
      <linearGradient id={`gloss-${id}`} x1="0" x2="1" y1="0" y2="1"><stop stopColor="#fff" stopOpacity=".4"/><stop offset=".5" stopColor="#fff" stopOpacity="0"/><stop offset="1" stopColor="#fff" stopOpacity=".18"/></linearGradient>
    </defs>
    <rect x="8" y="4" width="47" height="72" rx="6" fill="#333943" opacity=".15"/>
    <rect x="7" y="2.5" width="46" height="72" rx="5" fill={`url(#back-${id})`} stroke="#a3a8b2" strokeWidth=".65"/>
    {choice.id === 'oppo' ? <circle cx="24" cy="18" r="13" fill="#294f47" stroke="#a5cec1" strokeWidth="1.5"/> : null}
    {[0, 1, 2].slice(0, choice.id === 'vivo' ? 2 : 3).map((n) => <g key={n}>
      <circle cx={choice.id === 'oppo' ? 18 + n * 7 : 16 + (choice.id === 'apple' ? (n % 2) * 15 : 0)} cy={choice.id === 'oppo' ? 17 + (n % 2) * 7 : 13 + n * (choice.id === 'apple' ? 11 : 15)} r={choice.id === 'oppo' ? 3.6 : 5.3} fill="#29343f" stroke="#dce0e3" strokeWidth="1.3" />
      <circle cx={choice.id === 'oppo' ? 18 + n * 7 : 15 + (choice.id === 'apple' ? (n % 2) * 15 : 0)} cy={choice.id === 'oppo' ? 16 + (n % 2) * 7 : 12 + n * (choice.id === 'apple' ? 11 : 15)} r="1.8" fill="#71839d" />
    </g>)}
    <rect x="46" y="2.5" width="46" height="72" rx="5" fill="#1d2432" stroke="#454a57" strokeWidth="1"/>
    <rect x="48.2" y="4.8" width="41.7" height="67.7" rx="3.5" fill={`url(#screen-${id})`}/>
    <path d="M88 6 51 72h14L90 22V6Z" fill={`url(#gloss-${id})`} opacity=".85" />
    <path d="M50 67C68 42 70 47 89 16v24C70 58 65 58 50 72Z" fill="#fafaff" opacity=".25"/>
    <rect x="63" y="5.6" width="12" height="1.5" rx=".75" fill="#1a1d26"/>
    {choice.id === 'samsung' ? <path d="M3 59 0 77" stroke="#3a344d" strokeWidth="2"/> : null}
  </svg>
}
