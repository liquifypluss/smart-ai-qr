export type AdminConfig = {
  databaseUrl: string
  webOrigin: string
  csrfSecret: Buffer
  host: string
  port: number
  trustProxy: boolean
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent'
}

export function readAdminConfig(env: NodeJS.ProcessEnv = process.env): AdminConfig {
  const databaseUrl = env.ADMIN_DATABASE_URL ?? ''
  let db: URL
  try { db = new URL(databaseUrl) } catch { throw new Error('ADMIN_DATABASE_URL must be a PostgreSQL URL') }
  if (!['postgresql:', 'postgres:'].includes(db.protocol) || !db.hostname || !db.pathname.slice(1)) throw new Error('ADMIN_DATABASE_URL must identify a PostgreSQL database')
  const webOrigin = env.ADMIN_WEB_ORIGIN ?? ''
  try {
    const url = new URL(webOrigin)
    if (url.origin !== webOrigin || url.protocol !== 'https:' || url.username || url.password) throw new Error('Invalid origin')
  } catch { throw new Error('ADMIN_WEB_ORIGIN must be an exact HTTPS origin') }
  const csrfSecret = Buffer.from(env.ADMIN_CSRF_SECRET ?? '', 'base64')
  if (csrfSecret.length < 32 || csrfSecret.toString('base64') !== env.ADMIN_CSRF_SECRET) throw new Error('ADMIN_CSRF_SECRET must be a base64-encoded 32+ byte key')
  const port = Number(env.PORT ?? '3000')
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT')
  if (env.TRUST_PROXY !== undefined && !['0', '1'].includes(env.TRUST_PROXY)) throw new Error('TRUST_PROXY must be 0 or 1')
  const levels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const
  const logLevel = env.LOG_LEVEL ?? 'info'
  if (!levels.some((v) => v === logLevel)) throw new Error('Invalid LOG_LEVEL')
  return { databaseUrl, webOrigin, csrfSecret, host: env.HOST ?? '0.0.0.0', port, trustProxy: env.TRUST_PROXY === '1', logLevel: logLevel as AdminConfig['logLevel'] }
}
