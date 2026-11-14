import { useState } from 'react'
import type { BusinessConfig } from '../config/business'
import { CheckIcon, ChevronIcon } from './Icons'
import { PhoneArt } from './PhoneArt'

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
      {visible.map((choice) => {
        const active = selected === choice.id
        return <button key={choice.id} type="button" className={`brand-card${active ? ' is-selected' : ''}`} aria-pressed={active} onClick={() => onChange(active ? null : choice.id)}>
          {active && <span className="selection-check"><CheckIcon /></span>}
          {choice.imageUrl
            ? <img className="choice-image" src={choice.imageUrl} alt="" loading="lazy" />
            : choice.art
              ? <PhoneArt choice={choice} />
              : <svg className="phone-art" viewBox="0 0 98 79" aria-hidden="true"><rect x="15" y="10" width="68" height="58" rx="13" fill="#e8f1ff"/><path d="M31 25h36M31 38h36M31 51h22" stroke="#78a2ed" strokeWidth="5" strokeLinecap="round"/></svg>}
          <span className={`brand-wordmark brand-${choice.id}`}>
            {choice.id === 'apple' && <svg className="apple-symbol" viewBox="0 0 20 24" fill="currentColor" aria-hidden="true"><path d="M14.5 6.3c-.9 0-1.8.5-2.7.5-.9 0-1.7-.5-2.7-.5-2.1 0-4.2 1.8-4.2 5.1 0 3.4 2.7 8.3 5 8.3.9 0 1.6-.6 2.8-.6 1.1 0 1.7.6 2.7.6 2 0 4.4-4.3 4.4-7.3-2.4-.9-3.4-4-1.7-5.8-.9-.3-1.7-.3-2.6-.3Zm-1.6-.5c-.1-2.3 1.4-4 3.6-4.5.3 2.4-1.3 4.2-3.6 4.5Z"/></svg>}
            {choice.wordmark || choice.label}
          </span>
        </button>
      })}
    </div>
    {business.choices.length > 6 && <button className="show-more" type="button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>{expanded ? 'Show less' : 'Show more'} <ChevronIcon className={expanded ? 'turn-up' : undefined} /></button>}
  </section>
}
