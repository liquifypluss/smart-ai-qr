import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const directory = mkdtempSync(join(tmpdir(), 'smart-ai-qr-'))

try {
  for (const file of ['config/business', 'review/phrases', 'review/generate']) {
    const input = readFileSync(join(root, 'src', `${file}.ts`), 'utf8')
    const output = ts.transpileModule(input, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText.replace("from './phrases'", "from './phrases.mjs'")
    const target = join(directory, `${file}.mjs`)
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, output)
  }

  const { demoBusiness } = await import(pathToFileURL(join(directory, 'config/business.mjs')).href)
  const { generateReview } = await import(pathToFileURL(join(directory, 'review/generate.mjs')).href)
  let checks = 0
  for (const language of ['en', 'hi', 'hinglish']) {
    for (const rating of [0, 1, 2, 3, 4, 5]) {
      for (const choiceId of [null, 'apple']) {
        const context = { business: demoBusiness, choiceId, rating, language }
        let previous = ''
        for (let revision = 0; revision < 20; revision++) {
          const result = generateReview(context, revision, previous)
          assert.ok(result && result !== previous && result.includes(demoBusiness.name))
          assert.equal(result.includes('{item}'), false)
          if (choiceId) assert.ok(result.includes('Apple'))
          previous = result
          checks++
        }
      }
    }
  }
  console.log(`${checks} review generation checks passed`)
} finally {
  rmSync(directory, { recursive: true, force: true })
}
