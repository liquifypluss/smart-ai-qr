import Fastify, { type FastifyRequest, type FastifyReply } from 'fastify'
import { randomBytes } from 'node:crypto'
import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import argon2 from 'argon2'
import { and, desc, eq, gte, sql } from 'drizzle-orm'
import type pg from 'pg'
import type { Database } from '../../database/src/client.js'
import { adminSessions, adminUsers, auditLogs, businesses, businessLocations, qrCodes } from '../../database/src/schema.js'
import type { AdminConfig } from './config.js'
import { registerManagement } from './management.js'
import { createSession, csrfToken, digestEmail, normalizeEmail, passwordOptions, readSession, sessionCookie, validCsrf, type VerifiedSession } from './security.js'

declare module 'fastify' { interface FastifyRequest { adminSession?: VerifiedSession } }

const loginBody = {
  type: 'object', required: ['email', 'password'], additionalProperties: false,
  properties: {
    email: { type: 'string', minLength: 3, maxLength: 254, pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' },
    password: { type: 'string', minLength: 1, maxLength: 256 },
    remember: { type: 'boolean' }
  }
} as const

export async function buildAdminApp(config: AdminConfig, db: Database, pool: pg.Pool, logging = true) {
  const app = Fastify({
    logger: logging ? { level: config.logLevel, redact: ['req.headers.authorization', 'req.headers.cookie', 'req.headers.x-csrf-token', 'res.headers.set-cookie', 'req.body.password', 'databaseUrl'] } : false,
    trustProxy: config.trustProxy ? (_address: string, hop: number) => hop === 0 : false,
    bodyLimit: 4_000_000, requestTimeout: 10000, connectionTimeout: 10000
  })
  const dummyHash = await argon2.hash(randomBytes(32), passwordOptions)
  app.addHook('onClose', async () => { await pool.end() })
  await app.register(helmet)
  await app.register(cookie)
  await app.register(cors, {
    origin: (origin, callback) => callback(null, origin === config.webOrigin),
    credentials: true, methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['content-type', 'x-csrf-token'], strictPreflight: true
  })
  await app.register(rateLimit, { global: false, errorResponseBuilder: () => ({ statusCode: 429, error: 'Too many requests' }) })
  app.addHook('onSend', async (_request, reply) => { reply.header('Cache-Control', 'no-store'); reply.header('Pragma', 'no-cache') })
  app.setErrorHandler((error, request, reply) => {
    const issue = error as { validation?: unknown; statusCode?: number }
    if (issue.validation) return reply.code(400).send({ error: 'Invalid request' })
    if (issue.statusCode === 429) return reply.code(429).send({ error: 'Too many requests' })
    if (issue.statusCode === 415) return reply.code(415).send({ error: 'Unsupported media type' })
    if (issue.statusCode === 413) return reply.code(413).send({ error: 'File exceeds upload limit' })
    request.log.error({ err: error }, 'Admin request failed')
    return reply.code(500).send({ error: 'Internal server error' })
  })
  app.setNotFoundHandler((_request, reply) => reply.code(404).send({ error: 'Not found' }))

  async function audit(action: string, adminId: string | null, details: Record<string, unknown>) {
    await db.insert(auditLogs).values({ adminId, action, entityType: 'admin_auth', details })
  }
  function requireOrigin(request: FastifyRequest, reply: FastifyReply) {
    if (request.headers.origin !== config.webOrigin) { reply.code(403).send({ error: 'Forbidden' }); return false }
    return true
  }
  async function authenticate(request: FastifyRequest, reply: FastifyReply) {
    const session = await readSession(db, request.cookies[sessionCookie])
    if (!session) { reply.code(401).send({ error: 'Unauthorized' }); return }
    request.adminSession = session
  }
  async function superAdmin(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply)
    if (reply.sent) return
    if (request.adminSession?.role !== 'super_admin') reply.code(403).send({ error: 'Insufficient permissions' })
  }
  function checkCsrf(request: FastifyRequest, reply: FastifyReply) {
    if (!requireOrigin(request, reply)) return false
    if (!request.adminSession || !validCsrf(config.csrfSecret, request.adminSession.token, request.headers['x-csrf-token'])) {
      reply.code(403).send({ error: 'CSRF validation failed' }); return false
    }
    return true
  }
  app.get('/health', async () => ({ status: 'ok' }))
  app.get('/ready', async (_request, reply) => {
    try { await db.execute(sql`SELECT 1`); return { status: 'ok' } }
    catch { return reply.code(503).send({ status: 'unavailable' }) }
  })
  app.post<{ Body: { email: string; password: string; remember?: boolean } }>('/api/v1/admin/auth/login', {
    schema: { body: loginBody },
    config: { rateLimit: { max: 5, timeWindow: '1 minute', keyGenerator: (request: FastifyRequest) => request.ip } }
  }, async (request, reply) => {
    if (!requireOrigin(request, reply)) return
    const email = normalizeEmail(request.body.email)
    const subject = digestEmail(email)
    const cutoff = new Date(Date.now() - 15 * 60 * 1000)
    const failures = await db.select({ total: sql<number>`count(*)::int` }).from(auditLogs).where(and(
      eq(auditLogs.action, 'auth.login_failed'), gte(auditLogs.createdAt, cutoff), sql`${auditLogs.details}->>'subject' = ${subject}`
    ))
    if ((failures[0]?.total ?? 0) >= 10) return reply.code(429).send({ error: 'Too many requests' })
    const [user] = await db.select().from(adminUsers).where(sql`lower(${adminUsers.email}) = ${email}`).limit(1)
    let verified = false
    try { verified = await argon2.verify(user?.passwordHash ?? dummyHash, request.body.password) } catch { verified = false }
    if (!verified || user?.status !== 'active') {
      await audit('auth.login_failed', null, { subject })
      return reply.code(401).send({ error: 'Invalid email or password' })
    }
    const session = await createSession(db, user.id, request.body.remember === true)
    await audit('auth.login_success', user.id, {})
    reply.setCookie(sessionCookie, session.token, { path: '/', httpOnly: true, secure: true, sameSite: 'strict', maxAge: session.durationSeconds })
    return { user: { id: user.id, email: user.email, role: user.role }, csrfToken: csrfToken(config.csrfSecret, session.token), expiresAt: session.expiresAt.toISOString() }
  })
  app.get('/api/v1/admin/auth/session', { preHandler: authenticate }, async (request) => {
    const session = request.adminSession!
    return { user: { id: session.userId, email: session.email, role: session.role }, csrfToken: csrfToken(config.csrfSecret, session.token), expiresAt: session.expiresAt.toISOString() }
  })
  app.post('/api/v1/admin/auth/logout', { preHandler: authenticate }, async (request, reply) => {
    if (!checkCsrf(request, reply)) return
    await db.update(adminSessions).set({ revokedAt: new Date() }).where(eq(adminSessions.id, request.adminSession!.sessionId))
    await audit('auth.logout', request.adminSession!.userId, {})
    reply.clearCookie(sessionCookie, { path: '/', secure: true, httpOnly: true, sameSite: 'strict' })
    return { status: 'ok' }
  })
  app.get('/api/v1/admin/overview', { preHandler: superAdmin }, async () => {
    const counts = await db.execute(sql`SELECT
      (SELECT count(*)::int FROM businesses) AS total_businesses,
      (SELECT count(*)::int FROM businesses WHERE status = 'active') AS active_businesses,
      (SELECT count(*)::int FROM business_locations) AS total_locations,
      (SELECT count(*)::int FROM qr_codes) AS total_qr_codes,
      (SELECT count(*)::int FROM qr_codes WHERE status = 'active') AS active_qr_codes`)
    const recent = await db.select({ id: businesses.id, name: businesses.name, slug: businesses.slug, category: businesses.category, status: businesses.status, createdAt: businesses.createdAt }).from(businesses).orderBy(desc(businesses.createdAt)).limit(5)
    const activity = await db.select({ action: auditLogs.action, createdAt: auditLogs.createdAt }).from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(5)
    const row = counts.rows[0] as Record<string, number>
    return { metrics: { totalBusinesses: row.total_businesses, activeBusinesses: row.active_businesses, totalLocations: row.total_locations, totalQrCodes: row.total_qr_codes, activeQrCodes: row.active_qr_codes }, recentBusinesses: recent, recentActivity: activity }
  })
  await registerManagement(app, db, { read: superAdmin, write: async (request, reply) => { await superAdmin(request, reply); if (!reply.sent) checkCsrf(request, reply) } }, config.uploadDir)
  return app
}

