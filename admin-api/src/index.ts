import { createDatabase } from '../../database/src/client.js'
import { buildAdminApp } from './app.js'
import { readAdminConfig } from './config.js'

async function main() {
  const config = readAdminConfig()
  const { db, pool } = createDatabase(config.databaseUrl)
  const app = await buildAdminApp(config, db, pool)
  const shutdown = () => { void app.close().catch(() => { process.exitCode = 1 }) }
  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
  try { await app.listen({ host: config.host, port: config.port }) }
  catch { app.log.fatal('Admin API failed to start'); process.exitCode = 1; await app.close() }
}

main().catch(() => { process.stderr.write('Admin API configuration or startup failed\n'); process.exitCode = 1 })
