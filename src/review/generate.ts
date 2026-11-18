import type { BusinessConfig } from '../config/business'
import { phraseLibrary, type Language, type Sentiment, type PhraseSet, type PhraseLibrarySource } from './phrases'

export type ReviewContext = {
  business: BusinessConfig
  choiceId: string | null
  rating: Sentiment
  language: Language
  phraseLibrary?: PhraseLibrarySource
}

export function generateReview(context: ReviewContext, revision = 0, previous = ''): string {
  const { business, choiceId, rating, language } = context
  const defaults = phraseLibrary[language][rating]
  const custom = context.phraseLibrary?.[language]?.[rating]
  const choose = (part: keyof PhraseSet) => {
    const provided = custom?.[part]?.filter((value) => typeof value === 'string' && value.trim())
    return provided?.length ? provided : defaults[part]
  }
  const phrases: PhraseSet = { opening: choose('opening'), details: choose('details'), item: choose('item'), closing: choose('closing') }
  const choice = business.choices.find((item) => item.id === choiceId)
  const format = (template: string) => template.replaceAll('{business}', business.name).replaceAll('{item}', choice?.reviewLabel ?? '')

  for (let attempt = 0; attempt < 50; attempt++) {
    const n = revision + attempt
    const openingIndex = n % phrases.opening.length
    const detailIndex = Math.floor(n / phrases.opening.length) % phrases.details.length
    const itemIndex = Math.floor(n / (phrases.opening.length * phrases.details.length)) % phrases.item.length
    const closeIndex = Math.floor(n / (phrases.opening.length * phrases.details.length * (choice ? phrases.item.length : 1))) % phrases.closing.length
    const parts = [
      phrases.opening[openingIndex],
      phrases.details[detailIndex],
      ...(choice ? [phrases.item[itemIndex]] : []),
      phrases.closing[closeIndex]
    ]
    const review = parts.map(format).join(' ')
    if (review !== previous) return review
  }

  return previous
}
