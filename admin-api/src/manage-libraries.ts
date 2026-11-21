import type { FastifyInstance } from 'fastify'
import { and, asc, desc, eq, ilike, sql } from 'drizzle-orm'
import type { Database } from '../../database/src/client.js'
import { auditLogs, businesses, businessChoices, businessLocations, phraseLibraries, phraseLibraryAssignments, phraseTemplates, reviewSettings } from '../../database/src/schema.js'
import { toBusinessConfig } from '../../database/src/business-config.js'
import { activeLibraryAssignments, resolvePhraseSet } from '../../database/src/phrases.js'
import { generateReview } from '../../src/review/generate.js'
import { businessExists, childParams, handleConstraint, mutation, optionalText, pageOptions, pagingQuery, recordAudit, slugField, statusField, textField, uuidParams, type ChildParams, type Guards, type Paging, type Params } from './manage-utils.js'
import type { Language, Sentiment } from '../../src/review/phrases.js'

const base = '/api/v1/admin/phrase-libraries'
const libraryFields = { name: textField(), slug: slugField, description: optionalText(1200), industry: { anyOf: [textField(80), { type: 'null' }] }, ownerBusinessId: { anyOf: [{ type: 'string', format: 'uuid' }, { type: 'null' }] }, status: statusField }
type LibraryInput = { name: string; slug: string; description?: string; industry?: string | null; ownerBusinessId?: string | null; status?: 'active' | 'inactive' }
const phraseFields = { language: { type: 'string', enum: ['en','hi','hinglish'] }, rating: { type: 'integer', minimum: 0, maximum: 5 }, part: { type: 'string', enum: ['opening','details','item','closing'] }, phrase: textField(1000), sortOrder: { type: 'integer', minimum: 0, maximum: 10000 }, isActive: { type: 'boolean' } }
type PhraseInput = { language: Language; rating: Sentiment; part: 'opening'|'details'|'item'|'closing'; phrase: string; sortOrder: number; isActive?: boolean }
const assignmentFields = { libraryId: { type: 'string', format: 'uuid' }, priority: { type: 'integer', minimum: 0, maximum: 1000 }, isDefault: { type: 'boolean' } }
const previewQuery = { type: 'object', required: ['language','rating'], additionalProperties: false, properties: { language: phraseFields.language, rating: phraseFields.rating, choiceId: { type: 'string', maxLength: 80 } } }

export function registerLibraryRoutes(app: FastifyInstance, db: Database, guards: Guards) {
  app.get<{ Querystring: Paging }>(base, { preHandler: guards.read, schema: { querystring: pagingQuery } }, async request => {
    const { page, limit } = pageOptions(request.query)
    const terms = [request.query.q && ilike(phraseLibraries.name, `%${request.query.q.trim()}%`), request.query.status && eq(phraseLibraries.status, request.query.status), request.query.category && eq(phraseLibraries.industry, request.query.category)].filter((v): v is NonNullable<typeof v> => !!v)
    const where = terms.length ? and(...terms) : undefined
    const [count] = await db.select({ n: sql<number>`count(*)::int` }).from(phraseLibraries).where(where)
    const items = await db.select({
      id: phraseLibraries.id, slug: phraseLibraries.slug, name: phraseLibraries.name, description: phraseLibraries.description,
      industry: phraseLibraries.industry, ownerBusinessId: phraseLibraries.ownerBusinessId, status: phraseLibraries.status,
      createdAt: phraseLibraries.createdAt,
      businessCount: sql<number>`(SELECT count(*)::int FROM phrase_library_assignments WHERE library_id = ${phraseLibraries.id})`,
      phraseCount: sql<number>`(SELECT count(*)::int FROM phrase_templates WHERE library_id = ${phraseLibraries.id})`
    }).from(phraseLibraries).where(where).orderBy(desc(phraseLibraries.createdAt), desc(phraseLibraries.id)).limit(limit).offset((page-1)*limit)
    return { items, total: count.n, page, limit }
  })
  app.post<{ Body: LibraryInput }>(base, { preHandler: guards.write, schema: { body: mutation(libraryFields, ['name','slug']) } }, async (request, reply) => {
    if (request.body.ownerBusinessId && !await businessExists(db, request.body.ownerBusinessId)) return reply.code(400).send({ error: 'Exclusive library owner not found' })
    try {
      const [saved] = await db.insert(phraseLibraries).values(request.body).returning()
      await recordAudit(db, request.adminSession!.userId, 'phrase_library.created', saved.ownerBusinessId ?? null, 'phrase_library', saved.id)
      return reply.code(201).send(saved)
    } catch (error) { return handleConstraint(error, reply) }
  })
  app.get<{ Params: Params }>(`${base}/:id`, { preHandler: guards.read, schema: { params: uuidParams } }, async (request, reply) => {
    const [library] = await db.select().from(phraseLibraries).where(eq(phraseLibraries.id, request.params.id)).limit(1)
    if (!library) return reply.code(404).send({ error: 'Library not found' })
    const [phrases, businessesUsing] = await Promise.all([
      db.select().from(phraseTemplates).where(eq(phraseTemplates.libraryId, library.id)).orderBy(asc(phraseTemplates.language), asc(phraseTemplates.rating), asc(phraseTemplates.part), asc(phraseTemplates.sortOrder)),
      db.select({ id: businesses.id, name: businesses.name, slug: businesses.slug, priority: phraseLibraryAssignments.priority, isDefault: phraseLibraryAssignments.isDefault }).from(phraseLibraryAssignments).innerJoin(businesses, eq(businesses.id, phraseLibraryAssignments.businessId)).where(eq(phraseLibraryAssignments.libraryId, library.id)).orderBy(asc(businesses.name))
    ])
    return { library, phrases, businesses: businessesUsing }
  })
  app.patch<{ Params: Params; Body: Partial<LibraryInput> }>(`${base}/:id`, { preHandler: guards.write, schema: { params: uuidParams, body: mutation(libraryFields) } }, async (request, reply) => {
    const [existing] = await db.select().from(phraseLibraries).where(eq(phraseLibraries.id, request.params.id)).limit(1)
    if (!existing) return reply.code(404).send({ error: 'Library not found' })
    if (request.body.ownerBusinessId !== undefined && request.body.ownerBusinessId !== existing.ownerBusinessId) return reply.code(409).send({ error: 'Library ownership cannot be changed' })
    if (request.body.industry !== undefined && request.body.industry !== existing.industry) {
      const users = await db.select({ category: businesses.category }).from(phraseLibraryAssignments).innerJoin(businesses, eq(businesses.id, phraseLibraryAssignments.businessId)).where(eq(phraseLibraryAssignments.libraryId, existing.id))
      if (users.some(item => request.body.industry && item.category !== request.body.industry)) return reply.code(409).send({ error: 'Unassign incompatible businesses before changing industry' })
    }
    try {
      const [saved] = await db.update(phraseLibraries).set({ ...request.body, updatedAt: new Date() }).where(eq(phraseLibraries.id, existing.id)).returning()
      await recordAudit(db, request.adminSession!.userId, 'phrase_library.updated', saved.ownerBusinessId ?? null, 'phrase_library', saved.id, { fields: Object.keys(request.body) })
      return saved
    } catch (error) { return handleConstraint(error, reply) }
  })
  app.post<{ Params: Params; Body: { name: string; slug: string } }>(`${base}/:id/duplicate`, { preHandler: guards.write, schema: { params: uuidParams, body: mutation({ name: textField(), slug: slugField }, ['name','slug']) } }, async (request, reply) => {
    const [source] = await db.select().from(phraseLibraries).where(eq(phraseLibraries.id, request.params.id)).limit(1)
    if (!source) return reply.code(404).send({ error: 'Library not found' })
    try {
      const saved = await db.transaction(async tx => {
        const [copy] = await tx.insert(phraseLibraries).values({ slug: request.body.slug, name: request.body.name, description: source.description, industry: source.industry, ownerBusinessId: source.ownerBusinessId, status: 'inactive' }).returning()
        const phrases = await tx.select().from(phraseTemplates).where(eq(phraseTemplates.libraryId, source.id))
        if (phrases.length) await tx.insert(phraseTemplates).values(phrases.map(({ language, rating, part, phrase, sortOrder, isActive }) => ({ libraryId: copy.id, language, rating, part, phrase, sortOrder, isActive })))
        await tx.insert(auditLogs).values({ adminId: request.adminSession!.userId, businessId: copy.ownerBusinessId, action: 'phrase_library.duplicated', entityType: 'phrase_library', entityId: copy.id, details: { sourceId: source.id } })
        return copy
      })
      return reply.code(201).send(saved)
    } catch (error) { return handleConstraint(error, reply) }
  })
  app.post<{ Params: Params; Body: PhraseInput }>(`${base}/:id/phrases`, { preHandler: guards.write, schema: { params: uuidParams, body: mutation(phraseFields, ['language','rating','part','phrase','sortOrder']) } }, async (request, reply) => {
    const [library] = await db.select({ id: phraseLibraries.id, ownerBusinessId: phraseLibraries.ownerBusinessId }).from(phraseLibraries).where(eq(phraseLibraries.id, request.params.id)).limit(1)
    if (!library) return reply.code(404).send({ error: 'Library not found' })
    try {
      const [saved] = await db.insert(phraseTemplates).values({ ...request.body, libraryId: library.id }).returning()
      await recordAudit(db, request.adminSession!.userId, 'phrase.created', library.ownerBusinessId, 'phrase_template', saved.id, { libraryId: library.id })
      return reply.code(201).send(saved)
    } catch (error) { return handleConstraint(error, reply) }
  })
  app.patch<{ Params: ChildParams; Body: Partial<PhraseInput> }>(`${base}/:id/phrases/:childId`, { preHandler: guards.write, schema: { params: childParams, body: mutation(phraseFields) } }, async (request, reply) => {
    const [existing] = await db.select().from(phraseTemplates).where(and(eq(phraseTemplates.id, request.params.childId), eq(phraseTemplates.libraryId, request.params.id))).limit(1)
    if (!existing) return reply.code(404).send({ error: 'Phrase not found' })
    try {
      const [saved] = await db.update(phraseTemplates).set({ ...request.body, updatedAt: new Date() }).where(eq(phraseTemplates.id, existing.id)).returning()
      await recordAudit(db, request.adminSession!.userId, 'phrase.updated', null, 'phrase_template', saved.id, { libraryId: request.params.id, fields: Object.keys(request.body) })
      return saved
    } catch (error) { return handleConstraint(error, reply) }
  })
  const assignment = '/api/v1/admin/businesses/:id/phrase-libraries'
  app.post<{ Params: Params; Body: { libraryId: string; priority?: number; isDefault?: boolean } }>(assignment, { preHandler: guards.write, schema: { params: uuidParams, body: mutation(assignmentFields, ['libraryId']) } }, async (request, reply) => {
    const [business, library] = await Promise.all([businessExists(db, request.params.id), db.select().from(phraseLibraries).where(eq(phraseLibraries.id, request.body.libraryId)).limit(1).then(rows => rows[0])])
    if (!business || !library) return reply.code(404).send({ error: 'Business or library not found' })
    if (library.status !== 'active' || (library.ownerBusinessId && library.ownerBusinessId !== business.id) || (library.industry && library.industry !== business.category)) return reply.code(409).send({ error: 'Library cannot be assigned to this business' })
    try {
      const value = await db.transaction(async tx => {
        if (request.body.isDefault) await tx.update(phraseLibraryAssignments).set({ isDefault: false }).where(eq(phraseLibraryAssignments.businessId, business.id))
        const [saved] = await tx.insert(phraseLibraryAssignments).values({ businessId: business.id, libraryId: library.id, priority: request.body.priority ?? 100, isDefault: request.body.isDefault ?? false }).onConflictDoUpdate({ target: [phraseLibraryAssignments.businessId, phraseLibraryAssignments.libraryId], set: { priority: request.body.priority ?? 100, isDefault: request.body.isDefault ?? false } }).returning()
        await tx.insert(auditLogs).values({ adminId: request.adminSession!.userId, businessId: business.id, action: 'phrase_library.assigned', entityType: 'phrase_library', entityId: library.id, details: { priority: saved.priority } })
        return saved
      })
      return value
    } catch (error) { return handleConstraint(error, reply) }
  })
  app.delete<{ Params: ChildParams }>(`${assignment}/:childId`, { preHandler: guards.write, schema: { params: childParams } }, async (request, reply) => {
    const [removed] = await db.delete(phraseLibraryAssignments).where(and(eq(phraseLibraryAssignments.businessId, request.params.id), eq(phraseLibraryAssignments.libraryId, request.params.childId))).returning()
    if (!removed) return reply.code(404).send({ error: 'Assignment not found' })
    await recordAudit(db, request.adminSession!.userId, 'phrase_library.unassigned', request.params.id, 'phrase_library', removed.libraryId)
    return reply.code(204).send()
  })
  app.get<{ Params: Params; Querystring: { language: Language; rating: Sentiment; choiceId?: string } }>('/api/v1/admin/businesses/:id/review-preview', { preHandler: guards.read, schema: { params: uuidParams, querystring: previewQuery } }, async (request, reply) => {
    const business = await businessExists(db, request.params.id)
    if (!business) return reply.code(404).send({ error: 'Business not found' })
    const [settings] = await db.select().from(reviewSettings).where(eq(reviewSettings.businessId, business.id)).limit(1)
    if (!settings) return reply.code(409).send({ error: 'Review settings missing' })
    if (!settings.languages.includes(request.query.language)) return reply.code(400).send({ error: 'Language is disabled for this business' })
    const [locations, choices] = await Promise.all([db.select().from(businessLocations).where(and(eq(businessLocations.businessId, business.id), eq(businessLocations.status, 'active'))),db.select().from(businessChoices).where(and(eq(businessChoices.businessId, business.id), eq(businessChoices.status, 'active'))).orderBy(asc(businessChoices.sortOrder))])
    const mapped = toBusinessConfig({ business: { ...business, status: 'active' }, locations, choices, assets: [], settings, assetUrl: () => '' })
    const assignedLibraries = await activeLibraryAssignments(db, business.id)
    const phrases = await resolvePhraseSet(db, { businessId: business.id, industry: business.category, language: request.query.language, rating: request.query.rating, assignedLibraries })
    const phraseLibrary = { [request.query.language]: { [request.query.rating]: phrases } }
    const choiceId = choices.find(choice => choice.code === request.query.choiceId)?.code ?? null
    return { text: generateReview({ business: mapped, language: request.query.language, rating: request.query.rating, choiceId, phraseLibrary }), source: 'deterministic' }
  })
}
