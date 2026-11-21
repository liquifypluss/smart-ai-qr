import type { FastifyInstance } from 'fastify'
import { and, desc, eq, sql } from 'drizzle-orm'
import type { Database } from '../../database/src/client.js'
import { auditLogs, businesses } from '../../database/src/schema.js'
import type { Guards } from './manage-utils.js'
import { registerBusinessRoutes } from './manage-businesses.js'
import { registerQrRoutes } from './manage-qr.js'
import { registerLibraryRoutes } from './manage-libraries.js'
import { registerAssetRoutes } from './manage-assets.js'

export async function registerManagement(app: FastifyInstance, db: Database, guards: Guards, uploadDir?: string) {
  registerBusinessRoutes(app, db, guards)
  registerQrRoutes(app, db, guards)
  registerLibraryRoutes(app, db, guards)
  await registerAssetRoutes(app, db, guards, uploadDir)
  app.get<{ Querystring: { page?: number; limit?: number; action?: string; businessId?: string } }>('/api/v1/admin/activity', {
    preHandler: guards.read,
    schema: { querystring: { type: 'object', additionalProperties: false, properties: {
      page: { type: 'integer', minimum: 1, maximum: 100000, default: 1 }, limit: { type: 'integer', enum: [25,50], default: 25 },
      action: { type: 'string', maxLength: 100 }, businessId: { type: 'string', format: 'uuid' }
    } } }
  }, async request => {
    const page = request.query.page ?? 1, limit = request.query.limit ?? 25
    const filters = [request.query.action ? eq(auditLogs.action, request.query.action) : undefined, request.query.businessId ? eq(auditLogs.businessId, request.query.businessId) : undefined].filter((v): v is NonNullable<typeof v> => !!v)
    const where = filters.length ? and(...filters) : undefined
    const [count] = await db.select({ n: sql<number>`count(*)::int` }).from(auditLogs).where(where)
    const items = await db.select({ id: auditLogs.id, action: auditLogs.action, entityType: auditLogs.entityType, entityId: auditLogs.entityId, businessId: auditLogs.businessId, businessName: businesses.name, details: auditLogs.details, createdAt: auditLogs.createdAt }).from(auditLogs).leftJoin(businesses, eq(businesses.id, auditLogs.businessId)).where(where).orderBy(desc(auditLogs.createdAt), desc(auditLogs.id)).limit(limit).offset((page-1)*limit)
    return { items, total: count.n, page, limit }
  })
}
