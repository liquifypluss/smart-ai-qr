import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { FastifyInstance } from 'fastify'
import multipart from '@fastify/multipart'
import sharp from 'sharp'
import { and, eq } from 'drizzle-orm'
import type { Database } from '../../database/src/client.js'
import { businessAssets, businessChoices } from '../../database/src/schema.js'
import { businessExists, recordAudit, uuidParams, type Guards, type Params } from './manage-utils.js'

const assetQuery = { type: 'object', required: ['kind'], additionalProperties: false, properties: {
  kind: { type: 'string', enum: ['logo', 'header_image', 'choice_image', 'choice_logo'] },
  choiceId: { type: 'string', format: 'uuid' }
} } as const
const allowed = ['jpeg','png','webp']

export async function registerAssetRoutes(app: FastifyInstance, db: Database, guards: Guards, uploadDir?: string) {
  await app.register(multipart, { limits: { files: 1, fileSize: 3_000_000, fields: 0, parts: 1 } })
  app.post<{ Params: Params; Querystring: { kind: 'logo' | 'header_image' | 'choice_image' | 'choice_logo'; choiceId?: string } }>('/api/v1/admin/businesses/:id/assets', { preHandler: guards.write, schema: { params: uuidParams, querystring: assetQuery } }, async (request, reply) => {
    if (!uploadDir) return reply.code(503).send({ error: 'Persistent asset storage is not configured' })
    if (!await businessExists(db, request.params.id)) return reply.code(404).send({ error: 'Business not found' })
    const { kind, choiceId } = request.query
    if ((kind.startsWith('choice_') && !choiceId) || (!kind.startsWith('choice_') && choiceId)) return reply.code(400).send({ error: 'Invalid choice asset association' })
    if (choiceId) {
      const [choice] = await db.select({ id: businessChoices.id }).from(businessChoices).where(and(eq(businessChoices.id, choiceId), eq(businessChoices.businessId, request.params.id))).limit(1)
      if (!choice) return reply.code(400).send({ error: 'Choice does not belong to this business' })
    }
    const file = await request.file()
    if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) return reply.code(400).send({ error: 'Upload a JPEG, PNG or WebP image' })
    let output: Buffer
    let width: number | undefined
    let height: number | undefined
    try {
      const buffer = await file.toBuffer()
      const image = sharp(buffer, { limitInputPixels: 25_000_000, animated: false })
      const metadata = await image.metadata()
      if (!metadata.format || !allowed.includes(metadata.format) || !metadata.width || !metadata.height) return reply.code(400).send({ error: 'Unsupported or damaged image' })
      const result = await image.rotate().resize({ width: 1600, height: 1200, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82, effort: 4 }).toBuffer({ resolveWithObject: true })
      output = result.data
      width = result.info.width
      height = result.info.height
    } catch { return reply.code(400).send({ error: 'Invalid image or upload exceeds limit' }) }
    const storageKey = `uploads/${randomUUID()}.webp`
    await mkdir(resolve(uploadDir), { recursive: true, mode: 0o750 })
    await writeFile(resolve(uploadDir, storageKey.slice(8)), output, { flag: 'wx', mode: 0o640 })
    const records = await db.select().from(businessAssets).where(and(eq(businessAssets.businessId, request.params.id), eq(businessAssets.kind, kind), ...(choiceId ? [eq(businessAssets.choiceId, choiceId)] : [])))
    const existing = records.find(item => item.variant === 'default' && (item.choiceId ?? null) === (choiceId ?? null))
    const [saved] = existing
      ? await db.update(businessAssets).set({ storageKey, mimeType: 'image/webp', width, height, updatedAt: new Date() }).where(eq(businessAssets.id, existing.id)).returning()
      : await db.insert(businessAssets).values({ businessId: request.params.id, choiceId: choiceId ?? null, kind, variant: 'default', storageKey, mimeType: 'image/webp', width, height }).returning()
    await recordAudit(db, request.adminSession!.userId, 'asset.updated', request.params.id, 'business_asset', saved.id, { kind })
    return reply.code(201).send({ id: saved.id, kind, width, height, choiceId: saved.choiceId })
  })
}
