import { fileURLToPath } from 'node:url'
import { and, eq } from 'drizzle-orm'
import { createDatabase, type Database } from './client.js'
import { businesses, businessLocations, businessChoices, businessAssets, reviewSettings, phraseTemplates } from './schema.js'
import { demoBusiness } from '../../src/config/business.js'
import { phraseLibrary } from '../../src/review/phrases.js'

export async function seedDatabase(db: Database): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.insert(businesses).values({
      slug: demoBusiness.id,
      name: demoBusiness.name,
      category: demoBusiness.category,
      primaryColor: demoBusiness.primaryColor,
      destinationUrl: null
    }).onConflictDoNothing()
    const [business] = await tx.select({ id: businesses.id }).from(businesses).where(eq(businesses.slug, demoBusiness.id))
    if (!business) throw new Error('Could not seed demo business')
    const businessId = business.id
    await tx.insert(businessLocations).values({
      businessId,
      code: 'sigra',
      name: 'Gadget Gallery — Sigra',
      displayAddress: demoBusiness.location,
      city: 'Varanasi',
      region: 'Uttar Pradesh',
      country: 'India',
      isPrimary: true,
      destinationUrl: null
    }).onConflictDoNothing()
    await tx.insert(reviewSettings).values({
      businessId,
      choiceTitle: demoBusiness.choiceTitle,
      languages: ['en', 'hi', 'hinglish']
    }).onConflictDoNothing()
    for (const [sortOrder, choice] of demoBusiness.choices.entries()) {
      await tx.insert(businessChoices).values({
        businessId,
        code: choice.id,
        label: choice.label,
        reviewLabel: choice.reviewLabel,
        art: choice.art,
        wordmark: choice.wordmark,
        sortOrder
      }).onConflictDoNothing()
      if (choice.logoUrl) {
        const [savedChoice] = await tx.select({ id: businessChoices.id }).from(businessChoices).where(and(eq(businessChoices.businessId, businessId), eq(businessChoices.code, choice.id)))
        if (!savedChoice) throw new Error(`Choice missing: ${choice.id}`)
        await tx.insert(businessAssets).values({
          businessId,
          choiceId: savedChoice.id,
          kind: 'choice_logo',
          variant: 'default',
          storageKey: `src/assets/brands/${choice.id}.svg`,
          mimeType: 'image/svg+xml'
        }).onConflictDoNothing()
      }
    }
    for (const variant of [480, 960] as const) {
      await tx.insert(businessAssets).values({
        businessId,
        kind: 'header_image',
        variant: String(variant),
        storageKey: `src/assets/gadget-gallery-header-${variant}.webp`,
        mimeType: 'image/webp',
        width: variant
      }).onConflictDoNothing()
    }
    for (const language of ['en', 'hi', 'hinglish'] as const) {
      for (const rating of [0, 1, 2, 3, 4, 5] as const) {
        const set = phraseLibrary[language][rating]
        for (const part of ['opening', 'details', 'item', 'closing'] as const) {
          for (const [sortOrder, phrase] of set[part].entries()) {
            await tx.insert(phraseTemplates).values({ language, rating, part, phrase, sortOrder }).onConflictDoNothing()
          }
        }
      }
    }
  })
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { db, pool } = createDatabase(process.env.DATABASE_URL ?? '')
  seedDatabase(db).catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  }).finally(async () => pool.end())
}
