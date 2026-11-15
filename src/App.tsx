import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { BusinessHeader } from './components/BusinessHeader'
import { SelectionGrid } from './components/SelectionGrid'
import { ExperienceRating, type Rating } from './components/ExperienceRating'
import { ArrowIcon, GoogleIcon, RefreshIcon, WhatsAppIcon } from './components/Icons'
import { LanguageSwitcher } from './components/LanguageSwitcher'
import { demoBusiness } from './config/business'
import { generateReview } from './review/generate'
import type { Language } from './review/phrases'
import { copyReview, validReviewDestination } from './utils/clipboard'

const business = demoBusiness
const initialChoice = 'apple'
const initialRating: Rating = 5

type Feedback = { status: 'success' | 'error' | 'info'; message: string } | null

export default function App() {
  const [choiceId, setChoiceId] = useState<string | null>(initialChoice)
  const [rating, setRating] = useState<Rating | null>(initialRating)
  const [language, setLanguage] = useState<Language>('en')
  const [review, setReview] = useState(() => generateReview({ business, choiceId: initialChoice, rating: initialRating, language: 'en' }))
  const [rewriting, setRewriting] = useState(false)
  const [copying, setCopying] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [manualCopy, setManualCopy] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const rewriteTimer = useRef<number | null>(null)
  const revision = useRef(0)

  useEffect(() => () => { if (rewriteTimer.current !== null) window.clearTimeout(rewriteTimer.current) }, [])

  function rewrite() {
    if (rewriting) return
    setRewriting(true)
    setFeedback(null)
    setManualCopy(false)
    rewriteTimer.current = window.setTimeout(() => {
      try {
        revision.current += 1
        setReview((previous) => generateReview({ business, choiceId, rating: rating ?? 0, language }, revision.current, previous))
      } catch {
        setFeedback({ status: 'error', message: 'Could not rewrite. Please try again.' })
      } finally {
        setRewriting(false)
        rewriteTimer.current = null
      }
    }, 320)
  }

  async function copyAndContinue() {
    const text = review.trim()
    if (!text || copying || rewriting) return
    setCopying(true)
    setFeedback(null)
    setManualCopy(false)
    try {
      const copied = await copyReview(text)
      if (!copied) {
        textareaRef.current?.focus()
        textareaRef.current?.select()
        setManualCopy(true)
        setFeedback({ status: 'error', message: 'Copy is unavailable in this browser. Please copy the highlighted text manually.' })
        return
      }
      const destination = validReviewDestination(business.destinationUrl)
      if (destination) {
        window.location.assign(destination)
      } else {
        setFeedback({ status: business.destinationUrl ? 'error' : 'success', message: business.destinationUrl ? 'Review copied, but the configured destination is invalid.' : 'Review copied! This demo has no review destination configured.' })
      }
    } catch {
      textareaRef.current?.focus()
      textareaRef.current?.select()
      setManualCopy(true)
      setFeedback({ status: 'error', message: 'Could not copy automatically. Please copy the highlighted text manually.' })
    } finally {
      setCopying(false)
    }
  }

  return <main className="app-shell" style={{ '--primary': business.primaryColor } as CSSProperties}>
    <BusinessHeader business={business} />
    <div className="page-content">
      <SelectionGrid business={business} selected={choiceId} onChange={(value) => { setChoiceId(value); setFeedback(null) }} />
      <ExperienceRating selected={rating} onChange={(value) => { setRating(value); setFeedback(null) }} />
      <section className="review-section" aria-labelledby="review-heading">
        <div className="review-heading-row">
          <h2 id="review-heading">Your review</h2>
          <LanguageSwitcher value={language} onChange={(value) => { setLanguage(value); setFeedback(null) }} />
        </div>
        <div className="review-editor">
          <textarea ref={textareaRef} rows={5} lang={language === 'hi' ? 'hi' : 'en'} maxLength={2000} aria-label="Your editable review" value={review} onChange={(event) => { setReview(event.target.value); setFeedback(null); setManualCopy(false) }} spellCheck="true" />
          <div className="review-tools">
            <button className="rewrite-button" type="button" onClick={rewrite} disabled={rewriting || copying} aria-busy={rewriting}>
              <RefreshIcon className={rewriting ? 'spin' : ''} />{rewriting ? 'Rewriting...' : 'Rewrite'}
            </button>
          </div>
        </div>
        <button className="primary-button" type="button" onClick={copyAndContinue} disabled={!review.trim() || rewriting || copying}>
          <GoogleIcon /> <span>{copying ? 'Copying...' : 'Copy Review & Continue'}</span><ArrowIcon />
        </button>
        <div className="status-slot" role="status" aria-live="polite" aria-atomic="true">
          {feedback && <p className={`feedback feedback-${feedback.status}`}>{feedback.message}</p>}
          {!review.trim() && !feedback && <p className="feedback feedback-info">Enter a review or tap Rewrite to create one.</p>}
          {manualCopy && <button type="button" className="select-review" onClick={() => { textareaRef.current?.focus(); textareaRef.current?.select() }}>Select review text</button>}
        </div>
      </section>
      <footer className="page-footer">
        <p>Powered by <strong>AIBawaal</strong></p>
        <div className="footer-action-row">
          <p className="footer-inquiry">Ai Smart Qr for your business?</p>
          <a className="quote-link" href="https://wa.me/918827982930?text=Hi%20AIBawaal%2C%20I%27m%20interested%20in%20AI%20Smart%20QR%20for%20my%20business.%20Please%20share%20the%20details%20and%20pricing." target="_blank" rel="noopener noreferrer" aria-label="Get a Quote on WhatsApp">
            <WhatsAppIcon /><span>Get a Quote</span>
          </a>
        </div>
      </footer>
    </div>
  </main>
}
