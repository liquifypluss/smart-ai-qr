import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { sql } from 'drizzle-orm'
import type { Database } from '../../database/src/client.js'
import type pg from 'pg'
import { getPublicAsset } from './media.js'
import { findPublicBusiness, findPublicQr, getPublicPayload } from './public-data.js'
import { assetParams, notFound, publicPayload, qrParams, qrPayload, slugParams } from './public-schemas.js'
import type { ServerConfig } from './config.js'

export async function buildApp(config: ServerConfig, db: Database, pool: pg.Pool, logger = true) {
  const app = Fastify({
    logger: logger ? { level: config.logLevel, redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers.set-cookie', 'databaseUrl'] } : false,
    trustProxy: config.trustProxy ? 1 : false,
    bodyLimit: 16384,
    requestTimeout: 10000,
    connectionTimeout: 10000
  })
  app.addHook('onClose', async () => { await pool.end() })
  await app.register(helmet)
  await app.register(cors, {
    origin: (origin, callback) => callback(null, !!origin && config.corsOrigins.includes(origin)),
    methods: ['GET', 'OPTIONS'],
    credentials: false,
    strictPreflight: true
  })
  await app.register(rateLimit, { max: config.rateLimit, timeWindow: '1 minute', errorResponseBuilder: () => ({ error: 'Too many requests' }) })
  app.setErrorHandler((error, request, reply) => {
    if (error.validation) return reply.code(400).send({ error: 'Invalid request' })
    if (error.statusCode === 429) return reply.code(429).send({ error: 'Too many requests' })
    request.log.error({ err: error }, 'API request failed')
    return reply.code(500).send({ error: 'Internal server error' })
  })
  app.setNotFoundHandler((_request, reply) => reply.code(404).send({ error: 'Not found' }))
  app.get('/health', { config: { rateLimit: false } }, async () => ({ status: 'ok' }))
  app.get('/ready', { config: { rateLimit: false } }, async (_request, reply) => {
    try {
      await db.execute(sql`SELECT 1`)
      return { status: 'ok' }
    } catch {
      return reply.code(503).send({ status: 'unavailable' })
    }
  })
  app.get<{ Params: { slug: string } }>('/api/v1/public/businesses/:slug', {
    schema: { params: slugParams, response: { 200: publicPayload, 404: notFound } }
  }, async (request, reply) => {
    const business = await findPublicBusiness(db, request.params.slug)
    if (!business) return reply.code(404).send({ error: 'Not found' })
    const payload = await getPublicPayload(db, config, business)
    return payload ?? reply.code(404).send({ error: 'Not found' })
  })
  app.get<{ Params: { publicId: string } }>('/api/v1/public/qr/:publicId', {
    schema: { params: qrParams, response: { 200: qrPayload, 404: notFound } }
  }, async (request, reply) => {
    const record = await findPublicQr(db, request.params.publicId)
    if (!record) return reply.code(404).send({ error: 'Not found' })
    const payload = await getPublicPayload(db, config, record.business, record.location)
    if (!payload) return reply.code(404).send({ error: 'Not found' })
    return { ...payload, qr: { publicId: record.qr.publicId, label: record.qr.label } }
  })
  app.get<{ Params: { id: string } }>('/api/v1/public/assets/:id', {
    schema: { params: assetParams, response: { 404: notFound } }
  }, async (request, reply) => {
    const asset = await getPublicAsset(db, config, request.params.id)
    if (!asset) return reply.code(404).send({ error: 'Not found' })
    return reply.header('Cache-Control', 'public, max-age=3600').type(asset.type).send(asset.buffer)
  })
  return app
}
