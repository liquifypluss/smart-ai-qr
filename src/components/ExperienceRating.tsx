import { CheckIcon } from './Icons'

export type Rating = 1 | 2 | 3 | 4 | 5

const ratings: { value: Rating; label: string; color: string }[] = [
  { value: 1, label: 'Terrible', color: '#fb655c' },
  { value: 2, label: 'Bad', color: '#ffb92e' },
  { value: 3, label: 'Okay', color: '#ffde56' },
  { value: 4, label: 'Good', color: '#a5e74e' },
  { value: 5, label: 'Excellent', color: '#86df2d' }
]

function Face({ rating, fill }: { rating: Rating; fill: string }) {
  return <svg className="rating-face" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
    <circle cx="24" cy="24" r="21" fill={fill} />
    {rating < 3 && <><path d="m12 17 6-2M30 15l6 2" stroke="#5b3027" strokeWidth="2.1" strokeLinecap="round" fill="none" opacity={rating === 1 ? 1 : .45}/></>}
    <ellipse cx="17.2" cy={rating === 1 ? '21' : '20'} rx="2.1" ry="2.9" fill="#27302b"/><ellipse cx="30.8" cy={rating === 1 ? '21' : '20'} rx="2.1" ry="2.9" fill="#27302b"/>
    {rating === 1 && <path d="M15 35q9-14 18 0" stroke="#532f2e" strokeWidth="3" fill="none" strokeLinecap="round"/>}
    {rating === 2 && <path d="M16 33q8-9 16 0" stroke="#5f3c23" strokeWidth="2.7" fill="none" strokeLinecap="round"/>}
    {rating === 3 && <path d="M18 31q6 4 12 0" stroke="#433a18" strokeWidth="2.7" fill="none" strokeLinecap="round"/>}
    {rating === 4 && <path d="M15 28q9 12 18 0" stroke="#28451c" strokeWidth="3" fill="none" strokeLinecap="round"/>}
    {rating === 5 && <><path d="M11 27q13 22 26 0Z" fill="#23431d"/><path d="M17 29h14" stroke="#fff" strokeWidth="2.7" strokeLinecap="round"/></>}
  </svg>
}

export function ExperienceRating({ selected, onChange }: { selected: Rating | null; onChange: (value: Rating | null) => void }) {
  return <section className="rating-section" aria-labelledby="rating-heading">
    <h2 id="rating-heading">How was your experience?</h2>
    <div className="rating-options" role="group" aria-label="Rate your experience">
      {ratings.map(({ value, label, color }) => {
        const active = selected === value
        return <button key={value} type="button" aria-pressed={active} aria-label={`${label}, ${value} out of 5`} className={`rating-option${active ? ' is-selected' : ''}`} onClick={() => onChange(active ? null : value)}>
          {active && <span className="selection-check"><CheckIcon /></span>}
          <Face rating={value} fill={color} />
          <span>{label}</span>
        </button>
      })}
    </div>
  </section>
}
