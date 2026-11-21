import type { FastifyInstance } from 'fastify'
import { and, asc, desc, eq, ilike, sql } from 'drizzle-orm'
import type { Database } from '../../database/src/client.js'
import { auditLogs, businesses, businessAssets, businessChoices, businessLocations, phraseLibraries, phraseLibraryAssignments, qrCodes, reviewSettings } from '../../database/src/schema.js'
import { businessExists, childParams, colorField, handleConstraint, mutation, nullableUrl, optionalText, pageOptions, pagingQuery, recordAudit, safeDestination, slugField, statusField, textField, uuidParams, type ChildParams, type Guards, type Paging, type Params } from './manage-utils.js'

const businessFields = { name: textField(), slug: slugField, category: textField(80), primaryColor: colorField, destinationUrl: nullableUrl, status: statusField }
type BusinessInput = { name: string; slug: string; category: string; primaryColor?: string; destinationUrl?: string | null; status?: 'active' | 'inactive' }
const locationFields = { code: slugField, name: textField(), displayAddress: textField(500), city: optionalText(120), region: optionalText(120), country: optionalText(120), destinationUrl: nullableUrl, isPrimary: { type: 'boolean' }, status: statusField }
type LocationInput = { code: string; name: string; displayAddress: string; city?: string; region?: string; country?: string; destinationUrl?: string | null; isPrimary?: boolean; status?: 'active' | 'inactive' }
const artValues = ['silver','violet','blue','green','lavender','graphite','gold','charcoal','mint'] as const
const choiceFields = { code: slugField, label: textField(), reviewLabel: textField(200), wordmark: optionalText(60), art: { anyOf: [{ type: 'string', enum: [...artValues] }, { type: 'null' }] }, sortOrder: { type: 'integer', minimum: 0, maximum: 10000 }, status: statusField }
type ChoiceInput = { code: string; label: string; reviewLabel: string; wordmark?: string; art?: typeof artValues[number] | null; sortOrder?: number; status?: 'active' | 'inactive' }
type SettingsInput = { choiceTitle?: string; languages?: ('en' | 'hi' | 'hinglish')[] }
const settingsFields = { choiceTitle: textField(160), languages: { type: 'array', minItems: 1, maxItems: 3, uniqueItems: true, items: { type: 'string', enum: ['en','hi','hinglish'] } } }

export function registerBusinessRoutes(app: FastifyInstance, db: Database, guards: Guards) {
  const base = '/api/v1/admin/businesses'
  app.get<{ Querystring: Paging }>(base, { preHandler: guards.read, schema: { querystring: pagingQuery } }, async request => {
    const { page, limit } = pageOptions(request.query)
    const conditions = [request.query.status ? eq(businesses.status, request.query.status) : undefined, request.query.category ? eq(businesses.category, request.query.category) : undefined, request.query.q ? ilike(businesses.name, `%${request.query.q.trim()}%`) : undefined].filter((v): v is NonNullable<typeof v> => !!v)
    const where = conditions.length ? and(...conditions) : undefined
    const [count] = await db.select({ n: sql<number>`count(*)::int` }).from(businesses).where(where)
    const data = await db.select({ id: businesses.id, name: businesses.name, slug: businesses.slug, category: businesses.category, primaryColor: businesses.primaryColor, status: businesses.status, createdAt: businesses.createdAt,
      locationCount: sql<number>`(SELECT count(*)::int FROM business_locations WHERE business_id = ${businesses.id})`,
      qrCount: sql<number>`(SELECT count(*)::int FROM qr_codes WHERE business_id = ${businesses.id})`,
      logoId: sql<string | null>`(SELECT id::text FROM business_assets WHERE business_id = ${businesses.id} AND kind = 'logo' ORDER BY updated_at DESC LIMIT 1)`,
      libraries: sql<string>`(SELECT coalesce(string_agg(l.name, ', ' ORDER BY a.priority, l.name), '') FROM phrase_library_assignments a JOIN phrase_libraries l ON l.id = a.library_id WHERE a.business_id = ${businesses.id})`
    }).from(businesses).where(where).orderBy(desc(businesses.createdAt), desc(businesses.id)).limit(limit).offset((page - 1) * limit)
    return { items: data, total: count.n, page, limit }
  })
  app.post<{ Body: BusinessInput }>(base, { preHandler: guards.write, schema: { body: mutation(businessFields, ['name','slug','category']) } }, async (request, reply) => {
    if (safeDestination(request.body.destinationUrl) === false) return reply.code(400).send({ error: 'Invalid HTTPS review URL' })
    try {
      const result = await db.transaction(async tx => {
        const [created] = await tx.insert(businesses).values(request.body).returning()
        await tx.insert(reviewSettings).values({ businessId: created.id, choiceTitle: 'What stood out?', languages: ['en','hi','hinglish'] })
        await tx.insert(auditLogs).values({ adminId: request.adminSession!.userId, businessId: created.id, action: 'business.created', entityType: 'business', entityId: created.id, details: { slug: created.slug } })
        return created
      })
      return reply.code(201).send(result)
    } catch (error) { return handleConstraint(error, reply) }
  })
  app.get<{ Params: Params }>(`${base}/:id`, { preHandler: guards.read, schema: { params: uuidParams } }, async (request, reply) => {
    const business = await businessExists(db, request.params.id)
    if (!business) return reply.code(404).send({ error: 'Business not found' })
    const [locations, choices, assets, qr, settings, assigned] = await Promise.all([
      db.select().from(businessLocations).where(eq(businessLocations.businessId, business.id)).orderBy(asc(businessLocations.name)),
      db.select().from(businessChoices).where(eq(businessChoices.businessId, business.id)).orderBy(asc(businessChoices.sortOrder)),
      db.select({ id: businessAssets.id, kind: businessAssets.kind, variant: businessAssets.variant, choiceId: businessAssets.choiceId, width: businessAssets.width, height: businessAssets.height, mimeType: businessAssets.mimeType }).from(businessAssets).where(eq(businessAssets.businessId, business.id)),
      db.select().from(qrCodes).where(eq(qrCodes.businessId, business.id)).orderBy(desc(qrCodes.createdAt)),
      db.select().from(reviewSettings).where(eq(reviewSettings.businessId, business.id)).limit(1),
      db.select({ id: phraseLibraries.id, name: phraseLibraries.name, slug: phraseLibraries.slug, status: phraseLibraries.status, priority: phraseLibraryAssignments.priority, isDefault: phraseLibraryAssignments.isDefault }).from(phraseLibraryAssignments).innerJoin(phraseLibraries, eq(phraseLibraries.id, phraseLibraryAssignments.libraryId)).where(eq(phraseLibraryAssignments.businessId, business.id)).orderBy(asc(phraseLibraryAssignments.priority))
    ])
    return { business, locations, choices, assets, qrCodes: qr, settings: settings[0] ?? null, assignedLibraries: assigned }
  })
  app.patch<{ Params: Params; Body: Partial<BusinessInput> }>(`${base}/:id`, { preHandler: guards.write, schema: { params: uuidParams, body: mutation(businessFields) } }, async (request, reply) => {
    const existing = await businessExists(db, request.params.id)
    if (!existing) return reply.code(404).send({ error: 'Business not found' })
    if (safeDestination(request.body.destinationUrl) === false) return reply.code(400).send({ error: 'Invalid HTTPS review URL' })
    if (request.body.category && request.body.category !== existing.category) {
      const assigned = await db.select({ industry: phraseLibraries.industry }).from(phraseLibraryAssignments).innerJoin(phraseLibraries, eq(phraseLibraries.id, phraseLibraryAssignments.libraryId)).where(eq(phraseLibraryAssignments.businessId, existing.id))
      if (assigned.some(item => item.industry && item.industry !== request.body.category)) return reply.code(409).send({ error: 'Unassign incompatible phrase libraries before changing industry' })
    }
    try {
      const [saved] = await db.update(businesses).set({ ...request.body, updatedAt: new Date() }).where(eq(businesses.id, existing.id)).returning()
      await recordAudit(db, request.adminSession!.userId, 'business.updated', saved.id, 'business', saved.id, { fields: Object.keys(request.body) })
      return saved
    } catch (error) { return handleConstraint(error, reply) }
  })
  app.post<{ Params: Params; Body: LocationInput }>(`${base}/:id/locations`, { preHandler: guards.write, schema: { params: uuidParams, body: mutation(locationFields, ['code','name','displayAddress']) } }, async (request, reply) => {
    if (!await businessExists(db, request.params.id)) return reply.code(404).send({ error: 'Business not found' })
    if (safeDestination(request.body.destinationUrl) === false) return reply.code(400).send({ error: 'Invalid HTTPS review URL' })
    try {
      const saved = await db.transaction(async tx => {
        if (request.body.isPrimary) await tx.update(businessLocations).set({ isPrimary: false }).where(eq(businessLocations.businessId, request.params.id))
        const [result] = await tx.insert(businessLocations).values({ ...request.body, businessId: request.params.id }).returning()
        return result
      })
      await recordAudit(db, request.adminSession!.userId, 'location.created', request.params.id, 'location', saved.id)
      return reply.code(201).send(saved)
    } catch (error) { return handleConstraint(error, reply) }
  })
  app.patch<{ Params: ChildParams; Body: Partial<LocationInput> }>(`${base}/:id/locations/:childId`, { preHandler: guards.write, schema: { params: childParams, body: mutation(locationFields) } }, async (request, reply) => {
    if (safeDestination(request.body.destinationUrl) === false) return reply.code(400).send({ error: 'Invalid HTTPS review URL' })
    const [existing] = await db.select().from(businessLocations).where(and(eq(businessLocations.id, request.params.childId), eq(businessLocations.businessId, request.params.id))).limit(1)
    if (!existing) return reply.code(404).send({ error: 'Location not found' })
    try {
      const updated = await db.transaction(async tx => {
        if (request.body.isPrimary) await tx.update(businessLocations).set({ isPrimary: false }).where(eq(businessLocations.businessId, request.params.id))
        const [saved] = await tx.update(businessLocations).set({ ...request.body, updatedAt: new Date() }).where(eq(businessLocations.id, existing.id)).returning()
        return saved
      })
      await recordAudit(db, request.adminSession!.userId, 'location.updated', request.params.id, 'location', updated.id, { fields: Object.keys(request.body) })
      return updated
    } catch (error) { return handleConstraint(error, reply) }
  })
  app.post<{ Params: Params; Body: ChoiceInput }>(`${base}/:id/choices`, { preHandler: guards.write, schema: { params: uuidParams, body: mutation(choiceFields, ['code','label','reviewLabel']) } }, async (request, reply) => {
    if (!await businessExists(db, request.params.id)) return reply.code(404).send({ error: 'Business not found' })
    try {
      const [saved] = await db.insert(businessChoices).values({ ...request.body, businessId: request.params.id }).returning()
      await recordAudit(db, request.adminSession!.userId, 'choice.created', request.params.id, 'choice', saved.id)
      return reply.code(201).send(saved)
    } catch (error) { return handleConstraint(error, reply) }
  })
  app.patch<{ Params: ChildParams; Body: Partial<ChoiceInput> }>(`${base}/:id/choices/:childId`, { preHandler: guards.write, schema: { params: childParams, body: mutation(choiceFields) } }, async (request, reply) => {
    const [existing] = await db.select().from(businessChoices).where(and(eq(businessChoices.id, request.params.childId), eq(businessChoices.businessId, request.params.id))).limit(1)
    if (!existing) return reply.code(404).send({ error: 'Choice not found' })
    try {
      const [saved] = await db.update(businessChoices).set({ ...request.body, updatedAt: new Date() }).where(eq(businessChoices.id, existing.id)).returning()
      await recordAudit(db, request.adminSession!.userId, 'choice.updated', request.params.id, 'choice', saved.id, { fields: Object.keys(request.body) })
      return saved
    } catch (error) { return handleConstraint(error, reply) }
  })
  app.patch<{ Params: Params; Body: SettingsInput }>(`${base}/:id/review-settings`, { preHandler: guards.write, schema: { params: uuidParams, body: mutation(settingsFields) } }, async (request, reply) => {
    if (!await businessExists(db, request.params.id)) return reply.code(404).send({ error: 'Business not found' })
    const [saved] = await db.insert(reviewSettings).values({ businessId: request.params.id, choiceTitle: request.body.choiceTitle ?? 'What stood out?', languages: request.body.languages ?? ['en','hi','hinglish'] }).onConflictDoUpdate({ target: reviewSettings.businessId, set: { ...request.body, updatedAt: new Date() } }).returning()
    await recordAudit(db, request.adminSession!.userId, 'review_settings.updated', request.params.id, 'review_settings', saved.id, { fields: Object.keys(request.body) })
    return saved
  })
}
