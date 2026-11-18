import { useState } from 'react'
import type { BusinessConfig, Choice } from '../config/business'
import { CheckIcon, ChevronIcon } from './Icons'
import { PhoneArt } from './PhoneArt'

function ChoiceVisual({ choice }: { choice: Choice }) {
  const [failed, setFailed] = useState(false)
  if (choice.imageUrl && !failed) return <img className="choice-image" src={choice.imageUrl} alt="" width={98} height={79} loading="lazy" decoding="async" onError={() => setFailed(true)} />
  if (choice.art) return <PhoneArt choice={choice} />
  return <svg className="phone-art" viewBox="0 0 98 79" aria-hidden="true"><rect x="15" y="10" width="68" height="58" rx="13" fill="#e8f1ff"/><path d="M31 25h36M31 38h36M31 51h22" stroke="#78a2ed" strokeWidth="5" strokeLinecap="round"/></svg>
}

function BrandLogo({ choice, eager }: { choice: Choice; eager: boolean }) {
  const [failed, setFailed] = useState(false)
  return <span className="brand-logo-slot">
    {choice.logoUrl && !failed
      ? <img className="brand-logo" src={choice.logoUrl} alt="" width={96} height={20} loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setFailed(true)} />
      : <span className="brand-fallback-label">{choice.label}</span>}
  </span>
}

type Props = {
  business: BusinessConfig
  selected: string | null
  onChange: (id: string | null) => void
}

export function SelectionGrid({ business, selected, onChange }: Props) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? business.choices : business.choices.slice(0, 6)
  return <section className="brand-section" aria-labelledby="choices-heading">
    <h2 id="choices-heading">{business.choiceTitle}</h2>
    <div className="brand-grid">
      {visible.map((choice, index) => {
        const active = selected === choice.id
        return <button key={choice.id} type="button" className={`brand-card${active ? ' is-selected' : ''}`} aria-label={choice.label} aria-pressed={active} onClick={() => onChange(active ? null : choice.id)}>
          {active && <span className="selection-check"><CheckIcon /></span>}
          <ChoiceVisual choice={choice} />
          <BrandLogo choice={choice} eager={index < 6} />
        </button>
      })}
    </div>
    {business.choices.length > 6 && <button className="show-more" type="button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>{expanded ? 'Show less' : 'Show more'} <ChevronIcon className={expanded ? 'turn-up' : undefined} /></button>}
  </section>
}
