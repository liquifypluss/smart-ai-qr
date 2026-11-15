import { and, asc, eq, isNull, or } from 'drizzle-orm'
import { phraseTemplates } from './schema.js'
import type { Database } from './client.js'
import type { Language, Sentiment } from '../../src/review/phrases.js'

export type PhrasePart = 'opening' | 'details' | 'item' | 'closing'
export type ResolvedPhrases = Record<PhrasePart, string[]>

export async function resolvePhraseSet(db: Database, options: {
  businessId?: string
  industry?: string
  language: Language
  rating: Sentiment
}): Promise<ResolvedPhrases> {
  const filters = [and(isNull(phraseTemplates.businessId), isNull(phraseTemplates.industry))]
  if (options.industry) filters.push(and(isNull(phraseTemplates.businessId), eq(phraseTemplates.industry, options.industry)))
  if (options.businessId) filters.push(eq(phraseTemplates.businessId, options.businessId))
  const rows = await db.select().from(phraseTemplates).where(and(
    eq(phraseTemplates.language, options.language),
    eq(phraseTemplates.rating, options.rating),
    eq(phraseTemplates.isActive, true),
    or(...filters)
  )).orderBy(asc(phraseTemplates.sortOrder))
  const result = {} as ResolvedPhrases
  for (const part of ['opening', 'details', 'item', 'closing'] as const) {
    const candidates = rows.filter((row) => row.part === part)
    const matching = candidates.filter((row) => row.businessId === options.businessId && !!row.businessId)
    const industry = candidates.filter((row) => !row.businessId && row.industry === options.industry && !!row.industry)
    const global = candidates.filter((row) => !row.businessId && !row.industry)
    const selected = matching.length ? matching : industry.length ? industry : global
    if (!selected.length) throw new Error(`Missing phrase templates for ${options.language}/${options.rating}/${part}`)
    result[part] = selected.map((row) => row.phrase)
  }
  return result
}
