import { readFile, realpath } from 'node:fs/promises'
import { relative, resolve, sep } from 'node:path'
import { and, eq } from 'drizzle-orm'
import { businesses, businessAssets, businessChoices } from '../../database/src/schema.js'
import type { Database } from '../../database/src/client.js'
import type { ServerConfig } from './config.js'

const mediaTypes: Record<string, string> = { svg: 'image/svg+xml', webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg' }

export async function getPublicAsset(db: Database, config: ServerConfig, id: string) {
  const [asset] = await db.select().from(businessAssets).where(eq(businessAssets.id, id)).limit(1)
  if (!asset) return null
  const [business] = await db.select().from(businesses).where(and(eq(businesses.id, asset.businessId), eq(businesses.status, 'active'))).limit(1)
  if (!business) return null
  if (asset.choiceId) {
    const [choice] = await db.select().from(businessChoices).where(and(
      eq(businessChoices.id, asset.choiceId), eq(businessChoices.businessId, business.id), eq(businessChoices.status, 'active')
    )).limit(1)
    if (!choice) return null
  }
  if (!/^src\/assets\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(svg|webp|png|jpe?g)$/.test(asset.storageKey)) return null
  const ext = asset.storageKey.split('.').at(-1)!
  if (asset.mimeType !== mediaTypes[ext]) return null
  const root = await realpath(config.assetRoot)
  const target = resolve(root, asset.storageKey.slice('src/assets/'.length))
  try {
    const absolute = await realpath(target)
    const path = relative(root, absolute)
    if (path.startsWith('..'+sep) || path === '..' || path.startsWith(sep)) return null
    return { buffer: await readFile(absolute), type: asset.mimeType }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
}
