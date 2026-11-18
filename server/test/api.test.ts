import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { eq } from 'drizzle-orm'
import { createDatabase } from '../../database/src/client.js'
import { migrateDatabase } from '../../database/src/migrate.js'
import { seedDatabase } from '../../database/src/seed.js'
import { businesses, businessLocations, businessAssets, phraseTemplates, qrCodes } from '../../database/src/schema.js'
import { phraseLibrary } from '../../src/review/phrases.js'
import { buildApp } from '../src/app.js'
import { readConfig } from '../src/config.js'

const url = process.env.TEST_DATABASE_URL ?? ''
if (!url) throw new Error('TEST_DATABASE_URL is required')
const name = decodeURIComponent(new URL(url).pathname.slice(1))
if (!/^test_[a-z0-9_]+$|^[a-z0-9_]+_test$/.test(name) || url === process.env.DATABASE_URL) {
  throw new Error('API tests require a separate disposable *_test or test_* database')
}
const config = readConfig({
  DATABASE_URL: url,
  PUBLIC_API_ORIGIN: 'https://api.smartqr.liquifyplus.in',
  CORS_ORIGINS: 'https://smartqr.liquifyplus.in',
  ASSET_ROOT: resolve('../src/assets')
})
const randomId = () => randomBytes(24).toString('base64url')

test('public API integration', async (t) => {
  await migrateDatabase(url)
  const { db, pool } = createDatabase(url)
  const app = await buildApp(config, db, pool, false)
  t.after(async () => app.close())
  await seedDatabase(db)

  await t.test('liveness, database readiness, and security headers', async () => {
    const health = await app.inject('/health')
    const ready = await app.inject('/ready')
    assert.equal(health.statusCode, 200)
    assert.deepEqual(health.json(), { status: 'ok' })
    assert.equal(ready.statusCode, 200)
    assert.equal(ready.json().status, 'ok')
    assert.equal(health.headers['x-content-type-options'], 'nosniff')
  })

  await t.test('CORS allows only configured origin', async () => {
    const allowed = await app.inject({ url: '/health', headers: { origin: 'https://smartqr.liquifyplus.in' } })
    const blocked = await app.inject({ url: '/health', headers: { origin: 'https://evil.example' } })
    assert.equal(allowed.headers['access-control-allow-origin'], 'https://smartqr.liquifyplus.in')
    assert.equal(blocked.headers['access-control-allow-origin'], undefined)
  })

  await t.test('active business returns public-safe config and all seeded phrase categories', async () => {
    const response = await app.inject('/api/v1/public/businesses/gadget-gallery')
    assert.equal(response.statusCode, 200, response.body.slice(0, 500))
    const payload = response.json()
    assert.equal(payload.business.id, 'gadget-gallery')
    assert.deepEqual(payload.languages, ['en', 'hi', 'hinglish'])
    assert.equal(payload.business.choices.length, 9)
    assert.equal(payload.business.destinationUrl, null)
    assert.ok(payload.business.headerImage.src.startsWith(config.publicOrigin + '/api/v1/public/assets/'))
    assert.match(payload.business.choices[0].logoUrl, /^https:\/\/api\.smartqr\.liquifyplus\.in\/api\/v1\/public\/assets\/[0-9a-f-]{36}$/)
    for (const language of ['en', 'hi', 'hinglish'] as const) {
      for (const rating of [0, 1, 2, 3, 4, 5] as const) {
        assert.deepEqual(payload.phraseLibrary[language][rating], phraseLibrary[language][rating])
      }
    }
    assert.equal(payload.business.id.includes('-'), true)
    assert.doesNotMatch(response.body, /password_hash|token_hash|storage_key|admin_sessions|database_url|business_id|choice_id/i)
    assert.equal('status' in payload.business, false)
    assert.equal('createdAt' in payload.business, false)
  })

  await t.test('public image references resolve to allowed assets', async () => {
    const [asset] = await db.select().from(businessAssets).limit(1)
    assert.ok(asset)
    const response = await app.inject(`/api/v1/public/assets/${asset.id}`)
    assert.equal(response.statusCode, 200)
    assert.match(String(response.headers['content-type']), /^image\//)
    assert.ok(response.rawPayload.byteLength > 0)
    const invalid = await app.inject('/api/v1/public/assets/../../package.json')
    assert.equal(invalid.statusCode, 404)
    const invalidUuid = await app.inject('/api/v1/public/assets/not-a-uuid')
    assert.equal(invalidUuid.statusCode, 400)
  })

  await t.test('invalid and missing business slugs return safe errors', async () => {
    assert.equal((await app.inject('/api/v1/public/businesses/UPPERCASE')).statusCode, 400)
    assert.equal((await app.inject('/api/v1/public/businesses/does-not-exist')).statusCode, 404)
    assert.equal((await app.inject('/api/v1/public/businesses/does-not-exist')).json().error, 'Not found')
  })

  await t.test('QR resolves its own active location and validates identifiers', async () => {
    const [business] = await db.select().from(businesses).where(eq(businesses.slug, 'gadget-gallery'))
    const [location] = await db.select().from(businessLocations).where(eq(businessLocations.businessId, business.id))
    assert.ok(business && location)
    const id = randomId()
    await db.insert(qrCodes).values({ businessId: business.id, locationId: location.id, publicId: id, label: 'Test QR' })
    const res = await app.inject(`/api/v1/public/qr/${id}`)
    assert.equal(res.statusCode, 200, res.body.slice(0, 300))
    assert.equal(res.json().qr.publicId, id)
    assert.equal(res.json().qr.label, 'Test QR')
    assert.equal(res.json().business.location, location.displayAddress)
    assert.equal((await app.inject('/api/v1/public/qr/bad')).statusCode, 400)
    assert.equal((await app.inject(`/api/v1/public/qr/${randomId()}`)).statusCode, 404)
    await db.update(qrCodes).set({ status: 'inactive' }).where(eq(qrCodes.publicId, id))
    assert.equal((await app.inject(`/api/v1/public/qr/${id}`)).statusCode, 404)
  })

  await t.test('inactive businesses and inactive QR locations are not published', async () => {
    const [business] = await db.insert(businesses).values({ slug: `inactive-${randomUUID()}`, name: 'Inactive', category: 'electronics', status: 'inactive' }).returning()
    const id = randomId()
    await db.insert(qrCodes).values({ businessId: business.id, publicId: id })
    assert.equal((await app.inject(`/api/v1/public/businesses/${business.slug}`)).statusCode, 404)
    assert.equal((await app.inject(`/api/v1/public/qr/${id}`)).statusCode, 404)
    const [active] = await db.select().from(businesses).where(eq(businesses.slug, 'gadget-gallery'))
    const [location] = await db.insert(businessLocations).values({ businessId: active.id, code: `hidden-${randomUUID()}`, name: 'Hidden', displayAddress: 'Hidden location', status: 'inactive' }).returning()
    const hiddenId = randomId()
    await db.insert(qrCodes).values({ businessId: active.id, locationId: location.id, publicId: hiddenId })
    assert.equal((await app.inject(`/api/v1/public/qr/${hiddenId}`)).statusCode, 404)
  })

  await t.test('business override and industry phrase fallback do not alter global phrases', async () => {
    const industry = `restaurant-${randomUUID()}`
    const [business] = await db.insert(businesses).values({ slug: `phrases-${randomUUID()}`, name: 'Demo Restaurant', category: industry }).returning()
    const id = business.id
    const [originalSettings] = await db.select().from(businesses).where(eq(businesses.id, id))
    assert.ok(originalSettings)
    const { reviewSettings } = await import('../../database/src/schema.js')
    await db.insert(reviewSettings).values({ businessId: id, choiceTitle: 'Choose a dish', languages: ['hi'] })
    await db.insert(phraseTemplates).values({ industry, language: 'hi', rating: 5, part: 'opening', phrase: 'Industry phrase', sortOrder: 0 })
    let res = await app.inject(`/api/v1/public/businesses/${business.slug}`)
    assert.equal(res.statusCode, 200)
    assert.deepEqual(res.json().phraseLibrary.hi[5].opening, ['Industry phrase'])
    await db.insert(phraseTemplates).values({ businessId: id, language: 'hi', rating: 5, part: 'opening', phrase: 'Business phrase', sortOrder: 0 })
    res = await app.inject(`/api/v1/public/businesses/${business.slug}`)
    assert.deepEqual(res.json().phraseLibrary.hi[5].opening, ['Business phrase'])
    assert.deepEqual(res.json().phraseLibrary.hi[5].details, phraseLibrary.hi[5].details)
    assert.deepEqual(Object.keys(res.json().phraseLibrary), ['hi'])
  })

  await t.test('readiness fails closed when database connection fails', async () => {
    const badUrl = 'postgres://nobody:invalid@127.0.0.1:1/disposable_test'
    const { db: unavailable, pool: badPool } = createDatabase(badUrl)
    const isolated = await buildApp(config, unavailable, badPool, false)
    const live = await isolated.inject('/health')
    const ready = await isolated.inject('/ready')
    assert.equal(live.statusCode, 200)
    assert.equal(ready.statusCode, 503)
    assert.deepEqual(ready.json(), { status: 'unavailable' })
    await isolated.close()
  })
})

test('configuration requires explicit allowed origins and valid PostgreSQL URL', () => {
  assert.throws(() => readConfig({}), /DATABASE_URL/)
  assert.throws(() => readConfig({ DATABASE_URL: url, PUBLIC_API_ORIGIN: 'https://api.smartqr.liquifyplus.in', CORS_ORIGINS: '*' }), /CORS_ORIGINS/)
  assert.throws(() => readConfig({ DATABASE_URL: url, PUBLIC_API_ORIGIN: 'http://api.localhost', CORS_ORIGINS: 'https://smartqr.liquifyplus.in' }), /PUBLIC_API_ORIGIN/)
})
