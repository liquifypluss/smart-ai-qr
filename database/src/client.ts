import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import * as schema from './schema.js'

export function createDatabase(connectionString: string) {
  if (!connectionString) throw new Error('Database connection string is required')
  const pool = new pg.Pool({ connectionString, max: 5, connectionTimeoutMillis: 5000 })
  return { pool, db: drizzle(pool, { schema }) }
}

export type Database = ReturnType<typeof createDatabase>['db']
