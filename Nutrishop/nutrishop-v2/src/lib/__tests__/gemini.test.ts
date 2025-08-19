import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'

const modulePath = '../gemini'

test('imports without env vars', () => {
  const result = spawnSync(process.execPath, ['-r', 'tsx', '-e', "import('./src/lib/gemini.ts')"], {
    env: { ...process.env, GOOGLE_API_KEY: '', GEMINI_MODEL: '' }
  })
  assert.equal(result.status, 0)
})

test('parseMealPlanResponse extracts first JSON', async () => {
  process.env.GOOGLE_API_KEY = 'test'
  process.env.GEMINI_MODEL = 'test-model'
  const { parseMealPlanResponse } = await import(modulePath)
  const data = parseMealPlanResponse('foo {"days": []} bar {"other": 1}')
  assert.deepEqual(data, { days: [] })
})

test('analyzeNutrition parses model response', async () => {
  process.env.GOOGLE_API_KEY = 'test'
  process.env.GEMINI_MODEL = 'test-model'
  const { analyzeNutrition, setModel } = await import(modulePath)
  setModel({
    generateContent: async () => ({
      response: { text: () => '{"kcal": 100} extra' }
    })
  })
  const result = await analyzeNutrition('test food')
  assert.deepEqual(result, { kcal: 100 })
  setModel(null)
})
