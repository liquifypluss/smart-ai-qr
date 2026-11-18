import { and, asc, eq } from 'drizzle-orm'
import { toBusinessConfig } from '../../database/src/business-config.js'
import { resolvePhraseSet } from '../../database/src/phrases.js'
import { businesses, businessLocations, businessChoices, businessAssets, reviewSettings, qrCodes } from '../../database/src/schema.js'
import type { Database } from '../../database/src/client.js'
import type { Business, BusinessLocation } from '../../database/src/schema.js'
import type { Language, Sentiment } from '../../src/review/phrases.js'
import type { ServerConfig } from './config.js'

const ratings: Sentiment[] = [0, 1, 2, 3, 4, 5]
const supportedLanguages: Language[] = ['en', 'hi', 'hinglish']

export async function getPublicPayload(db: Database, config: ServerConfig, business: Business, location?: BusinessLocation) {
  if (business.status !== 'active') return null
  const [settings] = await db.select().from(reviewSettings).where(eq(reviewSettings.businessId, business.id)).limit(1)
  if (!settings) return null
  const [locations, choices, assets] = await Promise.all([
    location ? Promise.resolve([location]) : db.select().from(businessLocations).where(and(eq(businessLocations.businessId, business.id), eq(businessLocations.status, 'active'))),
    db.select().from(businessChoices).where(and(eq(businessChoices.businessId, business.id), eq(businessChoices.status, 'active'))).orderBy(asc(businessChoices.sortOrder)),
    db.select().from(businessAssets).where(eq(businessAssets.businessId, business.id))
  ])
  const assetIds = new Map(assets.map((asset) => [asset.storageKey, asset.id]))
  const mapped = toBusinessConfig({
    business, locations, choices, assets, settings,
    assetUrl: (key) => {
      const id = assetIds.get(key)
      if (!id) throw new Error('Asset reference missing')
      return `${config.publicOrigin}/api/v1/public/assets/${id}`
    }
  })
  const languages = supportedLanguages.filter((language) => settings.languages.includes(language))
  const records = await Promise.all(languages.flatMap((language) => ratings.map(async (rating) => ({
    language, rating,
    phrases: await resolvePhraseSet(db, { businessId: business.id, industry: business.category, language, rating })
  }))))
  const phraseLibrary: Record<string, Record<string, typeof records[number]['phrases']>> = {}
  for (const { language, rating, phrases } of records) {
    phraseLibrary[language] ??= {}
    phraseLibrary[language][rating] = phrases
  }
  return { business: mapped, languages, phraseLibrary }
}

export async function findPublicBusiness(db: Database, slug: string) {
  const [business] = await db.select().from(businesses).where(and(eq(businesses.slug, slug), eq(businesses.status, 'active'))).limit(1)
  return business
}

export async function findPublicQr(db: Database, publicId: string) {
  const [qr] = await db.select().from(qrCodes).where(and(eq(qrCodes.publicId, publicId), eq(qrCodes.status, 'active'))).limit(1)
  if (!qr) return null
  const [business] = await db.select().from(businesses).where(and(eq(businesses.id, qr.businessId), eq(businesses.status, 'active'))).limit(1)
  if (!business) return null
  let location: BusinessLocation | undefined
  if (qr.locationId) {
    const [found] = await db.select().from(businessLocations).where(and(
      eq(businessLocations.id, qr.locationId), eq(businessLocations.businessId, business.id), eq(businessLocations.status, 'active')
    )).limit(1)
    if (!found) return null
    location = found
  }
  return { qr, business, location }
}
