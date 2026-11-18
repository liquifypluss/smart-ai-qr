import { resolve } from 'node:path'

export type ServerConfig = {
  databaseUrl: string
  publicOrigin: string
  corsOrigins: string[]
  host: string
  port: number
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent'
  trustProxy: boolean
  assetRoot: string
  rateLimit: number
}

export function readConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const databaseUrl = env.DATABASE_URL ?? ''
  let database: URL
  try {
    database = new URL(databaseUrl)
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL URL')
  }
  if (!['postgres:', 'postgresql:'].includes(database.protocol) || !database.hostname || !database.pathname.slice(1)) {
    throw new Error('DATABASE_URL must identify a PostgreSQL database')
  }
  const publicOrigin = env.PUBLIC_API_ORIGIN ?? ''
  const corsOrigins = (env.CORS_ORIGINS ?? '').split(',').map((value) => value.trim()).filter(Boolean)
  const isOrigin = (value: string) => {
    try {
      const url = new URL(value)
      return url.protocol === 'https:' && url.origin === value && !url.username && !url.password
    } catch {
      return false
    }
  }
  if (!isOrigin(publicOrigin)) throw new Error('PUBLIC_API_ORIGIN must be an HTTPS origin')
  if (!corsOrigins.length || !corsOrigins.every(isOrigin)) throw new Error('CORS_ORIGINS must list explicit HTTPS origins')
  const port = Number(env.PORT ?? '3000')
  const rateLimit = Number(env.RATE_LIMIT_PER_MINUTE ?? '90')
  const levels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const
  const logLevel = env.LOG_LEVEL ?? 'info'
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT')
  if (!Number.isInteger(rateLimit) || rateLimit < 1 || rateLimit > 10000) throw new Error('Invalid RATE_LIMIT_PER_MINUTE')
  if (!levels.some((level) => level === logLevel)) throw new Error('Invalid LOG_LEVEL')
  if (env.TRUST_PROXY !== undefined && !['0', '1'].includes(env.TRUST_PROXY)) throw new Error('TRUST_PROXY must be 0 or 1')
  return {
    databaseUrl,
    publicOrigin,
    corsOrigins,
    host: env.HOST ?? '0.0.0.0',
    port,
    logLevel: logLevel as ServerConfig['logLevel'],
    trustProxy: env.TRUST_PROXY === '1',
    assetRoot: resolve(env.ASSET_ROOT ?? '../src/assets'),
    rateLimit
  }
}
