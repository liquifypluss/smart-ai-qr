import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const directory = mkdtempSync(join(tmpdir(), 'smart-ai-qr-dynamic-'))
const originalFetch = globalThis.fetch

try {
  for (const file of ['routing', 'api/public', 'config/business', 'review/phrases', 'review/generate']) {
    const source = readFileSync(join(root, 'src', `${file}.ts`), 'utf8')
    const output = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
    }).outputText.replace("from './phrases'", "from './phrases.mjs'")
    const target = join(directory, `${file}.mjs`)
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, output)
  }

  const moduleUrl = (file) => pathToFileURL(join(directory, `${file}.mjs`)).href
  const { resolvePageRoute } = await import(moduleUrl('routing'))
  const { loadPublicPage, parsePublicPayload, PublicApiError } = await import(moduleUrl('api/public'))
  const { generateReview } = await import(moduleUrl('review/generate'))
  const { demoBusiness } = await import(moduleUrl('config/business'))

  assert.deepEqual(resolvePageRoute('/'), { kind: 'demo' })
  assert.deepEqual(resolvePageRoute('/smart-ai-qr/', '/smart-ai-qr/'), { kind: 'demo' })
  assert.deepEqual(resolvePageRoute('/smart-ai-qr/b/gadget-gallery', '/smart-ai-qr/'), { kind: 'business', id: 'gadget-gallery' })
  assert.deepEqual(resolvePageRoute('/b/gadget-gallery/'), { kind: 'business', id: 'gadget-gallery' })
  assert.deepEqual(resolvePageRoute('/q/' + 'a'.repeat(24)), { kind: 'qr', id: 'a'.repeat(24) })
  for (const bad of ['/b/', '/b/INVALID', '/b/gadget-gallery/other', '/q/123', '/wrong', '/b/%2e%2e']) {
    assert.deepEqual(resolvePageRoute(bad), { kind: 'notFound' })
  }

  const context = { business: demoBusiness, choiceId: 'apple', rating: 5, language: 'hi', phraseLibrary: {
    hi: { 5: { opening: ['{business} में खास अनुभव।'], details: [], item: [], closing: ['फिर मिलेंगे।'] } }
  } }
  const review = generateReview(context)
  assert.ok(review.startsWith('Gadget Gallery में खास अनुभव।'))
  assert.ok(review.includes('फिर मिलेंगे।') && review.includes('Apple'))
  assert.ok(!review.includes('undefined') && !review.includes('{item}'))
  for (const language of ['en', 'hi', 'hinglish']) {
    for (const rating of [0, 1, 2, 3, 4, 5]) {
      const result = generateReview({ business: demoBusiness, choiceId: null, rating, language, phraseLibrary: {
        [language]: { [rating]: { opening: [], details: [], item: [], closing: [] } }
      } })
      assert.ok(result.includes('Gadget Gallery') && !result.includes('undefined'))
    }
  }

  const valid = { business: { ...demoBusiness, id: 'new-cafe', name: 'New Cafe', choices: [] },
    languages: ['hi', 'en'], phraseLibrary: { hi: { 5: { opening: ['हेलो'], details: [], item: [], closing: [] } } } }
  assert.deepEqual(parsePublicPayload(valid).languages, ['en', 'hi'])
  assert.throws(() => parsePublicPayload({ ...valid, business: null }), PublicApiError)
  assert.throws(() => parsePublicPayload({ ...valid, languages: [] }), PublicApiError)

  let calls = 0
  globalThis.fetch = async (url) => {
    calls++
    assert.match(String(url), /^https:\/\/api\.smartqr\.liquifyplus\.in\/api\/v1\/public\/businesses\/new-cafe$/)
    return new Response(JSON.stringify(valid), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }
  const route = { kind: 'business', id: 'new-cafe' }
  const controller = new AbortController()
  assert.equal((await loadPublicPage(route, controller.signal, 'https://api.smartqr.liquifyplus.in')).business.name, 'New Cafe')
  await loadPublicPage(route, controller.signal, 'https://api.smartqr.liquifyplus.in')
  assert.equal(calls, 1)

  const qr = { kind: 'qr', id: 'z'.repeat(24) }
  globalThis.fetch = async () => new Response(JSON.stringify({ ...valid, qr: { publicId: qr.id, label: null } }), { status: 200 })
  assert.equal((await loadPublicPage(qr, controller.signal, 'https://api.smartqr.liquifyplus.in')).qr?.publicId, qr.id)
  await assert.rejects(() => loadPublicPage({ kind: 'qr', id: 'x'.repeat(24) }, controller.signal, 'https://api.smartqr.liquifyplus.in'), PublicApiError)

  globalThis.fetch = async () => new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
  await assert.rejects(() => loadPublicPage({ kind: 'business', id: 'missing-business' }, controller.signal, 'https://api.smartqr.liquifyplus.in'), (error) => error.status === 'notFound')
  globalThis.fetch = async () => { throw new TypeError('offline') }
  await assert.rejects(() => loadPublicPage({ kind: 'business', id: 'offline-cafe' }, controller.signal, 'https://api.smartqr.liquifyplus.in'), (error) => error.status === 'network')
  await assert.rejects(() => loadPublicPage(route, controller.signal, 'http://insecure.example'), (error) => error.status === 'network')

  console.log('Dynamic routing, API loading, caching, 404/error, and review phrase fallback checks passed')
} finally {
  globalThis.fetch = originalFetch
  rmSync(directory, { recursive: true, force: true })
}
