import { readFile, stat } from 'node:fs/promises'
import argon2 from 'argon2'
import { sql } from 'drizzle-orm'
import { createDatabase } from '../../database/src/client.js'
import { adminUsers } from '../../database/src/schema.js'
import { normalizeEmail, passwordOptions } from './security.js'

export async function bootstrapAdmin(connectionString: string, email: string, password: string) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error('Valid ADMIN_BOOTSTRAP_EMAIL required')
  if (password.length < 12 || password.length > 256) throw new Error('Bootstrap password must contain 12–256 characters')
  const { db, pool } = createDatabase(connectionString)
  try {
    return await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(97531429)`)
      const present = await tx.select({ id: adminUsers.id }).from(adminUsers).limit(1)
      if (present.length) throw new Error('Bootstrap rejected: an administrator already exists')
      const passwordHash = await argon2.hash(password, passwordOptions)
      const inserted = await tx.insert(adminUsers).values({ email: normalizeEmail(email), passwordHash, role: 'super_admin', status: 'active' }).returning({ id: adminUsers.id })
      return inserted[0]!.id
    })
  } finally { await pool.end() }
}

async function main() {
  if (process.env.ADMIN_BOOTSTRAP_CONFIRM !== 'CREATE_INITIAL_SUPER_ADMIN') throw new Error('Explicit ADMIN_BOOTSTRAP_CONFIRM required')
  const file = process.env.ADMIN_BOOTSTRAP_PASSWORD_FILE
  if (!file) throw new Error('ADMIN_BOOTSTRAP_PASSWORD_FILE is required')
  const info = await stat(file)
  if (!info.isFile() || (info.mode & 0o077)) throw new Error('Password file must be private (mode 0600)')
  const password = (await readFile(file, 'utf8')).replace(/\r?\n$/, '')
  await bootstrapAdmin(process.env.ADMIN_BOOTSTRAP_DATABASE_URL ?? '', process.env.ADMIN_BOOTSTRAP_EMAIL ?? '', password)
  process.stdout.write('Initial administrator created successfully\n')
}

if (process.argv[1] && /(?:^|\/)bootstrap\.(?:ts|js)$/.test(process.argv[1])) {
  main().catch((error: unknown) => { process.stderr.write(error instanceof Error ? `${error.message}\n` : 'Bootstrap failed\n'); process.exitCode = 1 })
}
