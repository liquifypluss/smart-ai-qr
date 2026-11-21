import type { FastifyReply, FastifyRequest } from 'fastify'
import type { Database } from '../../database/src/client.js'
import { auditLogs, businesses } from '../../database/src/schema.js'
import { eq } from 'drizzle-orm'

export const uuidParams = { type: 'object', required: ['id'], additionalProperties: false, properties: { id: { type: 'string', format: 'uuid' } } } as const
export const childParams = { type: 'object', required: ['id', 'childId'], additionalProperties: false, properties: { id: { type: 'string', format: 'uuid' }, childId: { type: 'string', format: 'uuid' } } } as const
export const textField = (maxLength = 160) => ({ type: 'string', minLength: 1, maxLength })
export const optionalText = (maxLength = 1000) => ({ type: 'string', maxLength })
export const statusField = { type: 'string', enum: ['active', 'inactive'] } as const
export const nullableUrl = { anyOf: [{ type: 'string', pattern: '^https://[^\\s]+$', maxLength: 2048 }, { type: 'null' }] } as const
export const slugField = { type: 'string', pattern: '^[a-z0-9]+(-[a-z0-9]+)*$', maxLength: 90 } as const
export const colorField = { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' } as const
export const pagingQuery = { type: 'object', additionalProperties: false, properties: {
  page: { type: 'integer', minimum: 1, maximum: 100000, default: 1 },
  limit: { type: 'integer', enum: [25, 50], default: 25 },
  q: { type: 'string', maxLength: 120 },
  status: statusField,
  category: { type: 'string', maxLength: 80 }
} } as const
export const mutation = (properties: Record<string, unknown>, required: string[] = []) => ({ type: 'object', additionalProperties: false, required, properties })
export type Params = { id: string }
export type ChildParams = { id: string; childId: string }
export type Paging = { page?: number; limit?: number; q?: string; status?: 'active' | 'inactive'; category?: string }
export type Guards = {
  read: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  write: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
}
export const pageOptions = (query: Paging) => ({ page: query.page ?? 1, limit: query.limit ?? 25 })
export async function businessExists(db: Database, id: string) {
  const [business] = await db.select().from(businesses).where(eq(businesses.id, id)).limit(1)
  return business ?? null
}
export function safeDestination(value: string | null | undefined) {
  if (value === null || value === undefined) return value
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.hostname.length === 0 || value.trim() !== value) return false
    return value
  } catch { return false }
}
export async function recordAudit(db: Database, adminId: string, action: string, businessId: string | null, entityType: string, entityId: string | null, details: Record<string, unknown> = {}) {
  await db.insert(auditLogs).values({ adminId, action, businessId, entityType, entityId, details })
}
export function handleConstraint(error: unknown, reply: FastifyReply) {
  const code = (error as { code?: string; cause?: { code?: string } }).code ?? (error as { cause?: { code?: string } }).cause?.code
  if (code === '23505') return reply.code(409).send({ error: 'A matching record already exists' })
  if (code === '23503' || code === '23514' || code === '23502') return reply.code(400).send({ error: 'Invalid relationship or value' })
  throw error
}
