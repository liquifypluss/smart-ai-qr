import { randomBytes } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import { and, eq } from 'drizzle-orm'
import type { Database } from '../../database/src/client.js'
import { businessLocations, qrCodes } from '../../database/src/schema.js'
import { businessExists, childParams, handleConstraint, mutation, recordAudit, statusField, uuidParams, type ChildParams, type Guards, type Params } from './manage-utils.js'

const qrFields = {
  label: { type: 'string', maxLength: 140 },
  locationId: { anyOf: [{ type: 'string', format: 'uuid' }, { type: 'null' }] },
  template: { type: 'string', enum: ['signature', 'minimal', 'business'] },
  status: statusField
}
type QrInput = { label?: string; locationId?: string | null; template?: 'signature' | 'minimal' | 'business'; status?: 'active' | 'inactive' }

export function registerQrRoutes(app: FastifyInstance, db: Database, guards: Guards) {
  const base = '/api/v1/admin/businesses/:id/qr-codes'
  async function validLocation(businessId: string, locationId?: string | null) {
    if (!locationId) return true
    const [location] = await db.select({ id: businessLocations.id }).from(businessLocations).where(and(eq(businessLocations.businessId, businessId), eq(businessLocations.id, locationId))).limit(1)
    return !!location
  }
  app.post<{ Params: Params; Body: QrInput }>(base, { preHandler: guards.write, schema: { params: uuidParams, body: mutation(qrFields) } }, async (request, reply) => {
    if (!await businessExists(db, request.params.id)) return reply.code(404).send({ error: 'Business not found' })
    if (!await validLocation(request.params.id, request.body.locationId)) return reply.code(400).send({ error: 'Location does not belong to this business' })
    try {
      const [qr] = await db.insert(qrCodes).values({ ...request.body, businessId: request.params.id, publicId: randomBytes(24).toString('base64url') }).returning()
      await recordAudit(db, request.adminSession!.userId, 'qr.created', request.params.id, 'qr', qr.id, { template: qr.template })
      return reply.code(201).send(qr)
    } catch (error) { return handleConstraint(error, reply) }
  })
  app.patch<{ Params: ChildParams; Body: QrInput }>(`${base}/:childId`, { preHandler: guards.write, schema: { params: childParams, body: mutation(qrFields) } }, async (request, reply) => {
    const [existing] = await db.select().from(qrCodes).where(and(eq(qrCodes.id, request.params.childId), eq(qrCodes.businessId, request.params.id))).limit(1)
    if (!existing) return reply.code(404).send({ error: 'QR code not found' })
    if (!await validLocation(request.params.id, request.body.locationId)) return reply.code(400).send({ error: 'Location does not belong to this business' })
    try {
      const [saved] = await db.update(qrCodes).set({ ...request.body, updatedAt: new Date() }).where(eq(qrCodes.id, existing.id)).returning()
      await recordAudit(db, request.adminSession!.userId, request.body.status === 'inactive' ? 'qr.deactivated' : 'qr.updated', request.params.id, 'qr', saved.id, { fields: Object.keys(request.body) })
      return saved
    } catch (error) { return handleConstraint(error, reply) }
  })
}
