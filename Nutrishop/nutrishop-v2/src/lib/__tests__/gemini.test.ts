import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'

const modulePath = '../gemini'

test('fails to import without env vars', () => {
  const result = spawnSync(process.execPath, ['-e', "import('./src/lib/gemini.ts')"], {
    env: { ...process.env, GOOGLE_API_KEY: '', GEMINI_MODEL: '' }
  })
  assert.notEqual(result.status, 0)
})

test('parseMealPlanResponse extracts JSON', async () => {
  process.env.GOOGLE_API_KEY = 'test'
  process.env.GEMINI_MODEL = 'test-model'
  const { parseMealPlanResponse } = await import(modulePath)
  const data = parseMealPlanResponse('foo {"days": []} bar')
  assert.deepEqual(data, { days: [] })
})
