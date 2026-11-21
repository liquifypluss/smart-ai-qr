import { and, asc, eq, inArray, isNull, or } from 'drizzle-orm'
import { businesses, phraseLibraries, phraseLibraryAssignments, phraseTemplates } from './schema.js'
import type { Database } from './client.js'
import type { Language, Sentiment } from '../../src/review/phrases.js'

export type PhrasePart = 'opening' | 'details' | 'item' | 'closing'
export type ResolvedPhrases = Record<PhrasePart, string[]>
export type AssignedLibrary = { id: string; priority: number; isDefault: boolean }

export async function activeLibraryAssignments(db: Database, businessId: string): Promise<AssignedLibrary[]> {
  const records = await db.select({
    id: phraseLibraries.id, priority: phraseLibraryAssignments.priority,
    isDefault: phraseLibraryAssignments.isDefault,
    ownerId: phraseLibraries.ownerBusinessId, industry: phraseLibraries.industry,
    category: businesses.category
  }).from(phraseLibraryAssignments)
    .innerJoin(phraseLibraries, eq(phraseLibraryAssignments.libraryId, phraseLibraries.id))
    .innerJoin(businesses, eq(phraseLibraryAssignments.businessId, businesses.id))
    .where(and(eq(phraseLibraryAssignments.businessId, businessId), eq(phraseLibraries.status, 'active')))
    .orderBy(asc(phraseLibraryAssignments.priority), asc(phraseLibraries.slug))
  return records.filter(row => (!row.ownerId || row.ownerId === businessId) && (!row.industry || row.industry === row.category))
    .map(row => ({ id: row.id, priority: row.priority, isDefault: row.isDefault }))
}

export async function resolvePhraseSet(db: Database, options: {
  businessId?: string
  industry?: string
  language: Language
  rating: Sentiment
  assignedLibraries?: AssignedLibrary[]
}): Promise<ResolvedPhrases> {
  const assigned = options.assignedLibraries ?? (options.businessId ? await activeLibraryAssignments(db, options.businessId) : [])
  const legacy = [and(isNull(phraseTemplates.libraryId), isNull(phraseTemplates.businessId), isNull(phraseTemplates.industry))]
  if (options.industry) legacy.push(and(isNull(phraseTemplates.libraryId), isNull(phraseTemplates.businessId), eq(phraseTemplates.industry, options.industry)))
  if (options.businessId) legacy.push(and(isNull(phraseTemplates.libraryId), eq(phraseTemplates.businessId, options.businessId)))
  if (assigned.length) legacy.push(inArray(phraseTemplates.libraryId, assigned.map(row => row.id)))
  const rows = await db.select().from(phraseTemplates).where(and(
    eq(phraseTemplates.language, options.language),
    eq(phraseTemplates.rating, options.rating),
    eq(phraseTemplates.isActive, true),
    or(...legacy)
  )).orderBy(asc(phraseTemplates.sortOrder))
  const result = {} as ResolvedPhrases
  for (const part of ['opening', 'details', 'item', 'closing'] as const) {
    const candidates = rows.filter(row => row.part === part)
    const own = candidates.filter(row => row.businessId === options.businessId && !!row.businessId && !row.libraryId)
    const library = assigned.flatMap(entry => candidates.filter(row => row.libraryId === entry.id))
    const industry = candidates.filter(row => !row.businessId && !row.libraryId && row.industry === options.industry && !!row.industry)
    const global = candidates.filter(row => !row.businessId && !row.libraryId && !row.industry)
    const selected = own.length ? own : library.length ? library : industry.length ? industry : global
    if (!selected.length) throw new Error(`Missing phrase templates for ${options.language}/${options.rating}/${part}`)
    result[part] = selected.map(row => row.phrase)
  }
  return result
}
