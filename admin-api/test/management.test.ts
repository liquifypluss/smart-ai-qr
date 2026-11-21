import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import argon2 from 'argon2'
import { and, eq, sql } from 'drizzle-orm'
import { createDatabase } from '../../database/src/client.js'
import { migrateDatabase } from '../../database/src/migrate.js'
import { seedDatabase } from '../../database/src/seed.js'
import { resolvePhraseSet } from '../../database/src/phrases.js'
import { adminUsers, auditLogs, businesses, phraseTemplates, qrCodes } from '../../database/src/schema.js'
import { buildAdminApp } from '../src/app.js'
import { readAdminConfig } from '../src/config.js'
import { createSession, csrfToken, passwordOptions, sessionCookie } from '../src/security.js'

const url = process.env.TEST_DATABASE_URL ?? ''
if (!url) throw new Error('TEST_DATABASE_URL required')
const dbName = decodeURIComponent(new URL(url).pathname.slice(1))
if (!/^test_[a-z0-9_]+$|^[a-z0-9_]+_test$/.test(dbName) || [process.env.DATABASE_URL, process.env.ADMIN_DATABASE_URL].includes(url)) throw new Error('Tests require an isolated *_test database')

await test('Phase 5B admin management with disposable PostgreSQL', async t => {
  await migrateDatabase(url)
  const { db, pool } = createDatabase(url)
  const dir = await mkdtemp(join(tmpdir(), 'smartqr-admin-assets-'))
  const origin = 'https://admin.smartqr.liquifyplus.in'
  const config = readAdminConfig({ ADMIN_DATABASE_URL: url, ADMIN_WEB_ORIGIN: origin, ADMIN_CSRF_SECRET: randomBytes(32).toString('base64'), ADMIN_UPLOAD_DIR: dir, TRUST_PROXY: '1', LOG_LEVEL: 'silent' })
  const email = `management-${randomUUID()}@example.invalid`
  const [admin] = await db.insert(adminUsers).values({ email, role: 'super_admin', status: 'active', passwordHash: await argon2.hash('Management-Test-Password-Only', passwordOptions) }).returning()
  const session = await createSession(db, admin.id, false)
  const csrf = csrfToken(config.csrfSecret, session.token)
  const cookie = `${sessionCookie}=${session.token}`
  const app = await buildAdminApp(config, db, pool, false)
  await app.ready()
  t.after(async () => { await app.close(); await rm(dir, { recursive: true, force: true }) })
  const headers = { cookie, origin, 'x-csrf-token': csrf }
  const root = '/api/v1/admin'
  const send = (method: 'GET'|'POST'|'PATCH'|'DELETE', path: string, body?: object, override: Record<string,string> = {}) => app.inject({ method, url: root + path, headers: { ...headers, ...override }, ...(body ? { payload: body } : {}) })
  let businessId = '', otherId = '', locationId = '', qrId = '', qrPublicId = '', libraryId = ''
  const slug = `retail-${randomUUID().slice(0,8)}`

  await t.test('auth guards, role checks and CSRF prevent unauthorized management writes', async () => {
    assert.equal((await app.inject({ method:'GET', url:root+'/businesses' })).statusCode,401)
    assert.equal((await app.inject({ method:'POST', url:root+'/businesses', payload:{ name:'X',slug:'a',category:'b' } })).statusCode,401)
    assert.equal((await send('POST','/businesses',{name:'X',slug:'a',category:'b'},{'x-csrf-token':''})).statusCode,403)
    assert.equal((await send('POST','/businesses',{name:'X',slug:'a',category:'b'},{origin:'https://evil.invalid'})).statusCode,403)
    const [limited] = await db.insert(adminUsers).values({ email:`manager-${randomUUID()}@example.invalid`,passwordHash:await argon2.hash('Example-Private-Test-Password',passwordOptions),role:'admin' }).returning()
    const limitedSession = await createSession(db,limited.id,false)
    assert.equal((await send('GET','/businesses',undefined,{cookie:`${sessionCookie}=${limitedSession.token}`})).statusCode,403)
  })
  await t.test('create, list, edit and enforce unique business slugs', async () => {
    const added = await send('POST','/businesses',{name:'Retail Test',slug,category:'electronics',primaryColor:'#0753dd'})
    assert.equal(added.statusCode,201,added.body)
    businessId=added.json().id
    assert.equal((await send('POST','/businesses',{name:'Duplicate',slug,category:'electronics'})).statusCode,409)
    const listing=await send('GET',`/businesses?q=Retail%20Test&page=1`)
    assert.equal(listing.statusCode,200,listing.body)
    assert.ok(listing.json().items.some((item:{id:string})=>item.id===businessId))
    const changed=await send('PATCH',`/businesses/${businessId}`,{name:'Retail Updated',primaryColor:'#123456'})
    assert.equal(changed.statusCode,200,changed.body)
    assert.equal(changed.json().name,'Retail Updated')
    assert.equal((await send('PATCH',`/businesses/${businessId}`,{destinationUrl:'http://example.invalid'})).statusCode,400)
    const other=await send('POST','/businesses',{name:'Other Test',slug:`other-${randomUUID().slice(0,9)}`,category:'electronics'})
    assert.equal(other.statusCode,201,other.body)
    otherId=other.json().id
  })
  await t.test('location and QR ownership, secure identifiers and status updates', async () => {
    const location=await send('POST',`/businesses/${businessId}/locations`,{code:'main',name:'Main Store',displayAddress:'Example address',isPrimary:true})
    assert.equal(location.statusCode,201,location.body);locationId=location.json().id
    const invalidQr=await send('POST',`/businesses/${otherId}/qr-codes`,{label:'Wrong owner',locationId})
    assert.equal(invalidQr.statusCode,400)
    const a=await send('POST',`/businesses/${businessId}/qr-codes`,{label:'Main counter',locationId,template:'signature'})
    const b=await send('POST',`/businesses/${businessId}/qr-codes`,{label:'Billing counter',template:'business'})
    assert.equal(a.statusCode,201,a.body);assert.equal(b.statusCode,201,b.body)
    qrId=a.json().id;qrPublicId=a.json().publicId
    assert.match(qrPublicId,/^[A-Za-z0-9_-]{32}$/)
    assert.notEqual(qrPublicId,b.json().publicId)
    assert.notEqual(qrPublicId,qrId)
    const changed=await send('PATCH',`/businesses/${businessId}/qr-codes/${qrId}`,{status:'inactive'})
    assert.equal(changed.statusCode,200,changed.body)
    const [saved]=await db.select().from(qrCodes).where(eq(qrCodes.id,qrId))
    assert.equal(saved.status,'inactive')
    assert.equal((await send('PATCH',`/businesses/${otherId}/qr-codes/${qrId}`,{status:'active'})).statusCode,404)
  })
  await t.test('business choices and review settings remain compatible with public configuration', async () => {
    const choice=await send('POST',`/businesses/${businessId}/choices`,{code:'new-phone',label:'New Phone',reviewLabel:'new phone',sortOrder:1})
    assert.equal(choice.statusCode,201,choice.body)
    assert.equal((await send('PATCH',`/businesses/${otherId}/choices/${choice.json().id}`,{label:'Stolen'})).statusCode,404)
    const settings=await send('PATCH',`/businesses/${businessId}/review-settings`,{choiceTitle:'What did you choose?',languages:['en','hi','hinglish']})
    assert.equal(settings.statusCode,200,settings.body)
    const detail=await send('GET',`/businesses/${businessId}`)
    assert.equal(detail.statusCode,200,detail.body)
    assert.equal(detail.json().settings.choiceTitle,'What did you choose?')
    assert.equal(detail.json().business.id,businessId)
  })
  await t.test('create shared library, assign to multiple businesses, and resolve actual public phrases', async () => {
    const lib=await send('POST','/phrase-libraries',{name:'Mobile Store Reviews',slug:`mobile-${randomUUID().slice(0,8)}`,industry:'electronics'})
    assert.equal(lib.statusCode,201,lib.body);libraryId=lib.json().id
    const phrase=await send('POST',`/phrase-libraries/${libraryId}/phrases`,{language:'en',rating:5,part:'opening',phrase:'Shared library opening text',sortOrder:0})
    assert.equal(phrase.statusCode,201,phrase.body)
    assert.equal((await send('POST',`/businesses/${businessId}/phrase-libraries`,{libraryId,isDefault:true,priority:50})).statusCode,200)
    assert.equal((await send('POST',`/businesses/${otherId}/phrase-libraries`,{libraryId,priority:80})).statusCode,200)
    await seedDatabase(db)
    const resolved=await resolvePhraseSet(db,{businessId,industry:'electronics',language:'en',rating:5})
    assert.deepEqual(resolved.opening,['Shared library opening text'])
    assert.ok(resolved.details.length>0)
    const preview=await send('GET',`/businesses/${businessId}/review-preview?language=en&rating=5`)
    assert.equal(preview.statusCode,200,preview.body)
    assert.equal(preview.json().source,'deterministic')
    assert.ok(preview.json().text.includes('Shared library opening text'))
    const inactive=await send('PATCH',`/phrase-libraries/${libraryId}`,{status:'inactive'})
    assert.equal(inactive.statusCode,200,inactive.body)
    const fallback=await resolvePhraseSet(db,{businessId,industry:'electronics',language:'en',rating:5})
    assert.ok(fallback.opening.length>0)
    assert.ok(!fallback.opening.includes('Shared library opening text'))
    await send('PATCH',`/phrase-libraries/${libraryId}`,{status:'active'})
  })
  await t.test('exclusive libraries reject cross-business assignments and duplicates preserve phrases', async () => {
    const exclusive=await send('POST','/phrase-libraries',{name:'Exclusive',slug:`exclusive-${randomUUID().slice(0,8)}`,ownerBusinessId:businessId})
    assert.equal(exclusive.statusCode,201,exclusive.body)
    const rejected=await send('POST',`/businesses/${otherId}/phrase-libraries`,{libraryId:exclusive.json().id})
    assert.equal(rejected.statusCode,409)
    const duplicate=await send('POST',`/phrase-libraries/${libraryId}/duplicate`,{name:'Duplicated Library',slug:`copy-${randomUUID().slice(0,8)}`})
    assert.equal(duplicate.statusCode,201,duplicate.body)
    const detail=await send('GET',`/phrase-libraries/${duplicate.json().id}`)
    assert.equal(detail.statusCode,200,detail.body)
    assert.ok(detail.json().phrases.some((phrase:{phrase:string})=>phrase.phrase==='Shared library opening text'))
  })
  await t.test('invalid input and activity audit history are constrained', async () => {
    assert.equal((await send('GET','/businesses?page=-1')).statusCode,400)
    assert.equal((await send('POST','/businesses',{ name:'Broken',slug:'UPPER',category:'electronics'})).statusCode,400)
    const activity=await send('GET',`/activity?businessId=${businessId}`)
    assert.equal(activity.statusCode,200,activity.body)
    assert.ok(activity.json().items.some((event:{action:string})=>event.action==='business.created'))
    const [n]=await db.select({ count:sql<number>`count(*)::int` }).from(auditLogs)
    assert.ok(n.count>0)
  })
})
