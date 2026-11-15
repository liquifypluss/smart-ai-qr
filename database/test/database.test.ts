import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { test } from 'node:test'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { createDatabase } from '../src/client.js'
import { migrateDatabase } from '../src/migrate.js'
import { seedDatabase } from '../src/seed.js'
import { resolvePhraseSet } from '../src/phrases.js'
import { toBusinessConfig } from '../src/business-config.js'
import { businesses, businessLocations, businessChoices, businessAssets, qrCodes, reviewSettings, phraseTemplates, adminUsers, adminSessions } from '../src/schema.js'
import { demoBusiness } from '../../src/config/business.js'
import { phraseLibrary } from '../../src/review/phrases.js'

const connectionString = process.env.TEST_DATABASE_URL ?? ''
if (!connectionString) throw new Error('TEST_DATABASE_URL is required')
const databaseName = decodeURIComponent(new URL(connectionString).pathname.slice(1))
if (!/^test_[a-z0-9_]+$|^[a-z0-9_]+_test$/.test(databaseName)) throw new Error('Database tests require a database named test_* or *_test')
if (connectionString === process.env.DATABASE_URL) throw new Error('TEST_DATABASE_URL must not match DATABASE_URL')
const { db, pool } = createDatabase(connectionString)

function publicId() { return randomBytes(24).toString('base64url') }
function uniqueSlug() { return `test-${randomUUID()}` }

async function rejectsCode(operation: Promise<unknown>, code: string) {
  await assert.rejects(operation, (error: unknown) => {
    const actual = (error as { cause?: { code?: string }; code?: string }).cause?.code ?? (error as { code?: string }).code
    assert.equal(actual, code)
    return true
  })
}

test('PostgreSQL schema, seed, and isolation', async (t) => {
  t.after(async () => pool.end())
  await t.test('migrations apply and reapply without changes', async () => {
    await migrateDatabase(connectionString)
    await migrateDatabase(connectionString)
    const names = await db.execute(sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('admin_users','admin_sessions','businesses','business_locations','business_assets','business_choices','qr_codes','review_settings','phrase_templates','audit_logs')`)
    assert.equal(names.rows.length, 10)
  })

  await t.test('seed is idempotent and preserves original demo data', async () => {
    await seedDatabase(db)
    const before = await db.execute(sql`SELECT (SELECT count(*) FROM businesses) AS businesses, (SELECT count(*) FROM business_choices) AS choices, (SELECT count(*) FROM phrase_templates) AS phrases, (SELECT count(*) FROM business_assets) AS assets`)
    await seedDatabase(db)
    const after = await db.execute(sql`SELECT (SELECT count(*) FROM businesses) AS businesses, (SELECT count(*) FROM business_choices) AS choices, (SELECT count(*) FROM phrase_templates) AS phrases, (SELECT count(*) FROM business_assets) AS assets`)
    assert.deepEqual(after.rows, before.rows)
    const [business] = await db.select().from(businesses).where(eq(businesses.slug, 'gadget-gallery'))
    assert.ok(business)
    assert.equal(business.name, demoBusiness.name)
    assert.equal(business.destinationUrl, null)
    const choices = await db.select().from(businessChoices).where(eq(businessChoices.businessId, business.id))
    assert.deepEqual(choices.sort((a,b) => a.sortOrder - b.sortOrder).map(c => c.code), demoBusiness.choices.map(c => c.id))
    const settings = await db.select().from(reviewSettings).where(eq(reviewSettings.businessId, business.id))
    assert.deepEqual(settings[0].languages, ['en','hi','hinglish'])
    const locations = await db.select().from(businessLocations).where(eq(businessLocations.businessId, business.id))
    const assets = await db.select().from(businessAssets).where(eq(businessAssets.businessId, business.id))
    const config = toBusinessConfig({ business, locations, choices, assets, settings: settings[0], assetUrl: key => `/${key}` })
    assert.equal(config.name, demoBusiness.name)
    assert.equal(config.location, demoBusiness.location)
    assert.equal(config.choiceTitle, demoBusiness.choiceTitle)
    assert.equal(config.headerImage?.srcSet?.split(', ').length, 2)
    assert.equal(config.choices.length, 9)
  })

  await t.test('business uniqueness and validation constraints', async () => {
    const slug = uniqueSlug()
    await db.insert(businesses).values({ slug, name: 'Test Business', category: 'cafe' })
    await rejectsCode(db.insert(businesses).values({ slug, name: 'Duplicate', category: 'cafe' }), '23505')
    await rejectsCode(db.insert(businesses).values({ slug: 'WRONG SLUG', name: 'Invalid', category: 'cafe' }), '23514')
    await rejectsCode(db.insert(businesses).values({ slug: uniqueSlug(), name: 'Invalid URL', category: 'cafe', destinationUrl: 'http://example.com' }), '23514')
  })

  await t.test('cross-business location and asset ownership enforced by composite foreign keys', async () => {
    const [a] = await db.insert(businesses).values({ slug: uniqueSlug(), name: 'A', category: 'electronics' }).returning()
    const [b] = await db.insert(businesses).values({ slug: uniqueSlug(), name: 'B', category: 'restaurant' }).returning()
    const [location] = await db.insert(businessLocations).values({ businessId: b.id, code: 'here', name: 'Here', displayAddress: 'B location' }).returning()
    await rejectsCode(db.insert(businessLocations).values({ businessId: randomUUID(), code: 'bad', name: 'Bad', displayAddress: 'Unknown' }), '23503')
    await db.insert(qrCodes).values({ businessId: a.id, publicId: publicId(), locationId: null })
    await rejectsCode(db.insert(qrCodes).values({ businessId: a.id, locationId: location.id, publicId: publicId() }), '23503')
    const [choice] = await db.insert(businessChoices).values({ businessId: b.id, code: 'test', label: 'Test', reviewLabel: 'Test selection' }).returning()
    await rejectsCode(db.insert(businessAssets).values({ businessId: a.id, choiceId: choice.id, kind: 'choice_logo', storageKey: 'test.svg', mimeType: 'image/svg+xml' }), '23503')
    await rejectsCode(db.insert(businessChoices).values({ businessId: randomUUID(), code: 'wrong', label: 'Wrong', reviewLabel: 'Wrong' }), '23503')
  })

  await t.test('QR public IDs are unique and validated', async () => {
    const [b] = await db.insert(businesses).values({ slug: uniqueSlug(), name: 'QR Test', category: 'service' }).returning()
    const id = publicId()
    await db.insert(qrCodes).values({ businessId: b.id, publicId: id })
    await rejectsCode(db.insert(qrCodes).values({ businessId: b.id, publicId: id }), '23505')
    await rejectsCode(db.insert(qrCodes).values({ businessId: b.id, publicId: 'predictable' }), '23514')
  })

  await t.test('phrase inheritance and language/rating mapping', async () => {
    const [business] = await db.insert(businesses).values({ slug: uniqueSlug(), name: 'Phrase Demo', category: 'restaurant' }).returning()
    const global = await resolvePhraseSet(db, { language: 'hi', rating: 5 })
    assert.deepEqual(global.opening, phraseLibrary.hi[5].opening)
    assert.deepEqual(global.details, phraseLibrary.hi[5].details)
    for (const language of ['en','hi','hinglish'] as const) for (const rating of [0,1,2,3,4,5] as const) {
      const result = await resolvePhraseSet(db, { language, rating })
      assert.deepEqual(result, phraseLibrary[language][rating])
    }
    await db.insert(phraseTemplates).values({ industry: 'restaurant', language: 'hi', rating: 5, part: 'opening', phrase: 'Industry-specific', sortOrder: 0 })
    let inherited = await resolvePhraseSet(db, { businessId: business.id, industry: 'restaurant', language: 'hi', rating: 5 })
    assert.deepEqual(inherited.opening, ['Industry-specific'])
    assert.deepEqual(inherited.details, phraseLibrary.hi[5].details)
    await db.insert(phraseTemplates).values({ businessId: business.id, language: 'hi', rating: 5, part: 'opening', phrase: 'Business-specific', sortOrder: 0 })
    inherited = await resolvePhraseSet(db, { businessId: business.id, industry: 'restaurant', language: 'hi', rating: 5 })
    assert.deepEqual(inherited.opening, ['Business-specific'])
    await db.update(phraseTemplates).set({ isActive: false }).where(and(eq(phraseTemplates.businessId, business.id), eq(phraseTemplates.language, 'hi')))
    inherited = await resolvePhraseSet(db, { businessId: business.id, industry: 'restaurant', language: 'hi', rating: 5 })
    assert.deepEqual(inherited.opening, ['Industry-specific'])
    await rejectsCode(db.insert(phraseTemplates).values({ businessId: business.id, industry: 'restaurant', language: 'hi', rating: 5, part: 'opening', phrase: 'Invalid', sortOrder: 10 }), '23514')
    await rejectsCode(db.insert(phraseTemplates).values({ language: 'hi', rating: 6, part: 'opening', phrase: 'Invalid', sortOrder: 10 }), '23514')
  })

  await t.test('inactive businesses do not map to public configuration', async () => {
    const [business] = await db.select().from(businesses).where(eq(businesses.slug, 'gadget-gallery'))
    const [settings] = await db.select().from(reviewSettings).where(eq(reviewSettings.businessId, business.id))
    const disabled = { ...business, status: 'inactive' as const }
    assert.throws(() => toBusinessConfig({ business: disabled, locations: [], choices: [], assets: [], settings, assetUrl: key => key }), /inactive/)
  })

  await t.test('admin session hashes cannot contain plaintext tokens', async () => {
    await rejectsCode(db.insert(adminUsers).values({ email: `test-${randomUUID()}@example.invalid`, passwordHash: 'plaintext', role: 'admin' }), '23514')
    const [admin] = await db.insert(adminUsers).values({ email: `test-${randomUUID()}@example.invalid`, passwordHash: '$argon2id$test-placeholder-hash', role: 'admin' }).returning()
    await rejectsCode(db.insert(adminSessions).values({ adminId: admin.id, tokenHash: 'plaintext', expiresAt: new Date(Date.now() + 60_000) }), '23514')
  })
})
