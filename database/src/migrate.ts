import { fileURLToPath } from 'node:url'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { createDatabase } from './client.js'

export async function migrateDatabase(url: string) {
  const { db, pool } = createDatabase(url)
  try {
    await migrate(db, { migrationsFolder: fileURLToPath(new URL('../migrations/', import.meta.url)) })
  } finally {
    await pool.end()
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  migrateDatabase(process.env.DATABASE_URL ?? '').catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
}
