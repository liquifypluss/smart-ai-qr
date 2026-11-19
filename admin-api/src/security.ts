import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import argon2 from 'argon2'
import { and, eq, gt, isNull } from 'drizzle-orm'
import type { Database } from '../../database/src/client.js'
import { adminSessions, adminUsers } from '../../database/src/schema.js'

export const sessionCookie = '__Host-aibawaal_session'
export const passwordOptions = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 } as const
export const hashToken = (value: string) => createHash('sha256').update(value).digest('hex')
export const generateToken = () => randomBytes(32).toString('base64url')
export const digestEmail = (value: string) => hashToken(value.trim().toLowerCase())
export const normalizeEmail = (value: string) => value.trim().toLowerCase()
export const csrfToken = (key: Buffer, token: string) => createHmac('sha256', key).update(`csrf:v1:${token}`).digest('base64url')

export function validCsrf(key: Buffer, token: string, provided: unknown): boolean {
  if (typeof provided !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(provided)) return false
  const expected = Buffer.from(csrfToken(key, token))
  return timingSafeEqual(expected, Buffer.from(provided))
}

export async function readSession(db: Database, token: string | undefined) {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null
  const records = await db.select({
    userId: adminUsers.id,
    email: adminUsers.email,
    role: adminUsers.role,
    sessionId: adminSessions.id,
    expiresAt: adminSessions.expiresAt
  }).from(adminSessions).innerJoin(adminUsers, eq(adminSessions.adminId, adminUsers.id)).where(and(
    eq(adminSessions.tokenHash, hashToken(token)),
    gt(adminSessions.expiresAt, new Date()),
    isNull(adminSessions.revokedAt),
    eq(adminUsers.status, 'active')
  )).limit(1)
  return records[0] ? { ...records[0], token } : null
}

export type VerifiedSession = NonNullable<Awaited<ReturnType<typeof readSession>>>

export async function createSession(db: Database, adminId: string, remember: boolean) {
  const token = generateToken()
  const durationSeconds = remember ? 7 * 24 * 3600 : 8 * 3600
  const expiresAt = new Date(Date.now() + durationSeconds * 1000)
  await db.insert(adminSessions).values({ adminId, tokenHash: hashToken(token), expiresAt })
  return { token, durationSeconds, expiresAt }
}
