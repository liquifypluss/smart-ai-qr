import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { test } from 'node:test'
import argon2 from 'argon2'
import { eq, sql } from 'drizzle-orm'
import { createDatabase } from '../../database/src/client.js'
import { migrateDatabase } from '../../database/src/migrate.js'
import { adminSessions, adminUsers, auditLogs } from '../../database/src/schema.js'
import { buildAdminApp } from '../src/app.js'
import { bootstrapAdmin } from '../src/bootstrap.js'
import { readAdminConfig } from '../src/config.js'
import { hashToken, passwordOptions, sessionCookie } from '../src/security.js'

const url = process.env.TEST_DATABASE_URL ?? ''
if (!url) throw new Error('TEST_DATABASE_URL is required')
const databaseName = decodeURIComponent(new URL(url).pathname.slice(1))
if (!/^test_[a-z0-9_]+$|^[a-z0-9_]+_test$/.test(databaseName)) throw new Error('Tests require test_* or *_test PostgreSQL database')
if (url === process.env.ADMIN_DATABASE_URL || url === process.env.DATABASE_URL) throw new Error('Test database must differ from live database')
const origin = 'https://admin.smartqr.liquifyplus.in'
const password = 'Example-Strong-Test-Password-1234'
const email = `operator-${randomUUID()}@example.invalid`
const csrfSecret = randomBytes(32).toString('base64')
const cfg = readAdminConfig({ ADMIN_DATABASE_URL: url, ADMIN_WEB_ORIGIN: origin, ADMIN_CSRF_SECRET: csrfSecret, TRUST_PROXY: '1', LOG_LEVEL: 'silent' })

await test('admin authentication and security on isolated PostgreSQL', async (t) => {
  await migrateDatabase(url)
  const adminId = await bootstrapAdmin(url, email, password)
  await t.test('one-time bootstrap and Argon2id password hashing', async () => {
    const { db, pool } = createDatabase(url)
    try {
      await assert.rejects(bootstrapAdmin(url, `second-${randomUUID()}@example.invalid`, password), /already exists/)
      const [user] = await db.select().from(adminUsers).where(eq(adminUsers.id, adminId))
      assert.ok(user.passwordHash.startsWith('$argon2id$'))
      assert.notEqual(user.passwordHash, password)
      assert.equal(await argon2.verify(user.passwordHash, password), true)
      assert.equal(await argon2.verify(user.passwordHash, 'wrong'), false)
    } finally { await pool.end() }
  })
  const { db, pool } = createDatabase(url)
  const app = await buildAdminApp(cfg, db, pool, false)
  await app.ready()
  t.after(async () => { await app.close() })
  const req = (method: 'GET' | 'POST', path: string, headers: Record<string, string> = {}, payload?: object) => app.inject({ method, url: path, headers, payload })
  function credentials(ip: string) { return { origin, 'x-forwarded-for': ip } }
  const loginPath = '/api/v1/admin/auth/login'
  const sessionPath = '/api/v1/admin/auth/session'
  const logoutPath = '/api/v1/admin/auth/logout'

  await t.test('unauthenticated endpoints reject requests and readiness is live', async () => {
    assert.equal((await req('GET', '/health')).statusCode, 200)
    assert.equal((await req('GET', '/ready')).statusCode, 200)
    assert.equal((await req('GET', sessionPath)).statusCode, 401)
    assert.equal((await req('GET', '/api/v1/admin/overview')).statusCode, 401)
  })
  await t.test('login enforces exact origin, validates input, hides account existence', async () => {
    assert.equal((await req('POST', loginPath, {}, { email, password })).statusCode, 403)
    assert.equal((await req('POST', loginPath, credentials('203.0.113.3'), { email: 'invalid', password })).statusCode, 400)
    const missing = await req('POST', loginPath, credentials('203.0.113.5'), { email: 'missing@example.invalid', password: 'wrong' })
    const bad = await req('POST', loginPath, credentials('203.0.113.6'), { email, password: 'wrong' })
    assert.equal(missing.statusCode, 401)
    assert.equal(bad.statusCode, 401)
    assert.deepEqual(missing.json(), bad.json())
    assert.equal(missing.headers['access-control-allow-origin'], origin)
    const wrongOrigin = await req('POST', loginPath, { origin: 'https://attacker.example', 'x-forwarded-for': '203.0.113.7' }, { email, password })
    assert.equal(wrongOrigin.statusCode, 403)
    assert.equal(wrongOrigin.headers['access-control-allow-origin'], undefined)
  })
  let cookie = '', csrf = ''
  await t.test('successful login creates a Secure HttpOnly SameSite session', async () => {
    const result = await req('POST', loginPath, credentials('203.0.113.10'), { email, password })
    assert.equal(result.statusCode, 200, result.body)
    cookie = String(result.headers['set-cookie']).split(';')[0]
    assert.ok(cookie.startsWith(sessionCookie + '='))
    assert.match(String(result.headers['set-cookie']), /HttpOnly/)
    assert.match(String(result.headers['set-cookie']), /Secure/)
    assert.match(String(result.headers['set-cookie']), /SameSite=Strict/i)
    csrf = result.json().csrfToken
    assert.equal(result.json().user.role, 'super_admin')
    assert.equal(result.json().user.passwordHash, undefined)
    assert.equal(result.json().token, undefined)
    const token = decodeURIComponent(cookie.split('=')[1])
    const [record] = await db.select().from(adminSessions).where(eq(adminSessions.adminId, adminId))
    assert.ok(record)
    assert.equal(record.tokenHash, hashToken(token))
    assert.equal(record.tokenHash.includes(token), false)
    const session = await req('GET', sessionPath, { cookie })
    assert.equal(session.statusCode, 200)
    assert.equal(session.json().csrfToken, csrf)
    const overview = await req('GET', '/api/v1/admin/overview', { cookie })
    assert.equal(overview.statusCode, 200)
    assert.ok(overview.json().metrics.totalBusinesses >= 0)
    assert.ok(Array.isArray(overview.json().recentBusinesses))
    assert.equal(overview.json().adminUsers, undefined)
    assert.equal(overview.json().sessions, undefined)
  })
  await t.test('CSRF and Origin checks prevent unauthorized logout', async () => {
    assert.equal((await req('POST', logoutPath, { cookie, origin })).statusCode, 403)
    assert.equal((await req('POST', logoutPath, { cookie, origin, 'x-csrf-token': 'bad' })).statusCode, 403)
    assert.equal((await req('POST', logoutPath, { cookie, origin: 'https://evil.example', 'x-csrf-token': csrf })).statusCode, 403)
    assert.equal((await req('GET', sessionPath, { cookie })).statusCode, 200)
  })
  await t.test('role authorization rejects non-super-admin', async () => {
    const hash = await argon2.hash(password, passwordOptions)
    const [other] = await db.insert(adminUsers).values({ email: `limited-${randomUUID()}@example.invalid`, passwordHash: hash, role: 'admin' }).returning()
    const body = await req('POST', loginPath, credentials('203.0.113.11'), { email: other.email, password })
    assert.equal(body.statusCode, 200)
    const limitedCookie = String(body.headers['set-cookie']).split(';')[0]
    assert.equal((await req('GET', '/api/v1/admin/overview', { cookie: limitedCookie })).statusCode, 403)
  })
  await t.test('session expiration and inactive account invalidate access', async () => {
    const [session] = await db.select().from(adminSessions).where(eq(adminSessions.adminId, adminId))
    await db.update(adminUsers).set({ status: 'inactive' }).where(eq(adminUsers.id, adminId))
    assert.equal((await req('GET', sessionPath, { cookie })).statusCode, 401)
    await db.update(adminUsers).set({ status: 'active' }).where(eq(adminUsers.id, adminId))
    await db.update(adminSessions).set({ expiresAt: new Date(Date.now() - 60000) }).where(eq(adminSessions.id, session.id))
    assert.equal((await req('GET', sessionPath, { cookie })).statusCode, 401)
  })
  await t.test('logout revokes server session and does not expose private data', async () => {
    const signedIn = await req('POST', loginPath, credentials('203.0.113.12'), { email, password })
    assert.equal(signedIn.statusCode, 200)
    const activeCookie = String(signedIn.headers['set-cookie']).split(';')[0]
    const result = await req('POST', logoutPath, { cookie: activeCookie, origin, 'x-csrf-token': signedIn.json().csrfToken })
    assert.equal(result.statusCode, 200)
    assert.equal((await req('GET', sessionPath, { cookie: activeCookie })).statusCode, 401)
    const logs = await db.select().from(auditLogs).where(eq(auditLogs.entityType, 'admin_auth'))
    assert.ok(logs.some(log => log.action === 'auth.login_failed'))
    assert.ok(logs.some(log => log.action === 'auth.login_success'))
    assert.ok(logs.some(log => log.action === 'auth.logout'))
    assert.ok(!JSON.stringify(logs).includes(password))
    assert.ok(!JSON.stringify(logs).includes(activeCookie.split('=')[1]))
  })
  await t.test('login attempts are rate-limited per client IP', async () => {
    const headers = credentials('203.0.113.199')
    for (let i = 0; i < 5; i++) assert.equal((await req('POST', loginPath, headers, { email, password: 'wrong' })).statusCode, 401)
    assert.equal((await req('POST', loginPath, headers, { email, password: 'wrong' })).statusCode, 429)
  })
  await t.test('configuration rejects missing secrets and invalid origin', () => {
    assert.throws(() => readAdminConfig({ ADMIN_DATABASE_URL: url, ADMIN_WEB_ORIGIN: origin }), /ADMIN_CSRF_SECRET/)
    assert.throws(() => readAdminConfig({ ADMIN_DATABASE_URL: url, ADMIN_WEB_ORIGIN: 'http://evil.test', ADMIN_CSRF_SECRET: csrfSecret }), /ADMIN_WEB_ORIGIN/)
  })
})
