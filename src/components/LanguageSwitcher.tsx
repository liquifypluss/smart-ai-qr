import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { CheckIcon, ChevronIcon, LanguageIcon } from './Icons'
import type { Language } from '../review/phrases'

const languages: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी' },
  { value: 'hinglish', label: 'Hinglish' }
]

export function LanguageSwitcher({ value, onChange }: { value: Language; onChange: (value: Language) => void }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const label = languages.find((language) => language.value === value)?.label ?? 'English'

  useEffect(() => {
    if (!open) return
    menuRef.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus({ preventScroll: true })
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function moveFocus(event: ReactKeyboardEvent<HTMLDivElement>) {
    const buttons = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [])
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement)
    let next = current
    if (event.key === 'ArrowDown') next = (current + 1) % buttons.length
    else if (event.key === 'ArrowUp') next = (current + buttons.length - 1) % buttons.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = buttons.length - 1
    else return
    event.preventDefault()
    buttons[next]?.focus()
  }

  return <div className="language-field" ref={rootRef} onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false)
  }}>
    <button ref={triggerRef} type="button" className="language-trigger" aria-label={`Review language: ${label}`} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? 'review-language-options' : undefined} onClick={() => setOpen((current) => !current)} onKeyDown={(event) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        setOpen(true)
      }
    }}>
      <LanguageIcon /><span>{label}</span><ChevronIcon className="language-chevron" />
    </button>
    {open && <div id="review-language-options" className="language-menu" ref={menuRef} role="listbox" aria-label="Review language" onKeyDown={moveFocus}>
      {languages.map((language) => <button key={language.value} type="button" role="option" aria-selected={language.value === value} className="language-option" onClick={() => {
        onChange(language.value)
        setOpen(false)
        triggerRef.current?.focus()
      }}>
        <span>{language.label}</span>{language.value === value && <CheckIcon />}
      </button>)}
    </div>}
  </div>
}
