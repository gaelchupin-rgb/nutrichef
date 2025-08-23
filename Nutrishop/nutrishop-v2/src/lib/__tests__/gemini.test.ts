import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { GoogleGenerativeAI } from '@google/generative-ai'

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

test('parseMealPlanResponse handles nested JSON', async () => {
  process.env.GOOGLE_API_KEY = 'test'
  process.env.GEMINI_MODEL = 'test-model'
  const { parseMealPlanResponse } = await import(modulePath)
  const text = 'start {"a": {"b": [1, 2, {"c": 3}]}} end'
  const data = parseMealPlanResponse(text)
  assert.deepEqual(data, { a: { b: [1, 2, { c: 3 }] } })
})

test('parseMealPlanResponse strips code fences and extra text', async () => {
  process.env.GOOGLE_API_KEY = 'test'
  process.env.GEMINI_MODEL = 'test-model'
  const { parseMealPlanResponse } = await import(modulePath)
  const response = '```json\n{"days": []}\n``` noise'
  const data = parseMealPlanResponse(response)
  assert.deepEqual(data, { days: [] })
})

test('parseMealPlanResponse handles braces inside strings', async () => {
  process.env.GOOGLE_API_KEY = 'test'
  process.env.GEMINI_MODEL = 'test-model'
  const { parseMealPlanResponse } = await import(modulePath)
  const text = '{"a": "value with { brace", "b": 1}'
  const data = parseMealPlanResponse(text)
  assert.deepEqual(data, { a: 'value with { brace', b: 1 })
})

test('parseMealPlanResponse repairs malformed JSON', async () => {
  process.env.GOOGLE_API_KEY = 'test'
  process.env.GEMINI_MODEL = 'test-model'
  const { parseMealPlanResponse } = await import(modulePath)
  const data = parseMealPlanResponse('noise {a:1,} more')
  assert.deepEqual(data, { a: 1 })
})

test('parseMealPlanResponse rejects non-object JSON', async () => {
  process.env.GOOGLE_API_KEY = 'test'
  process.env.GEMINI_MODEL = 'test-model'
  const { parseMealPlanResponse } = await import(modulePath)
  assert.throws(() => parseMealPlanResponse('42'), /Format du plan repas invalide/)
})

test('parseMealPlanResponse rejects arrays', async () => {
  process.env.GOOGLE_API_KEY = 'test'
  process.env.GEMINI_MODEL = 'test-model'
  const { parseMealPlanResponse } = await import(modulePath)
  assert.throws(() => parseMealPlanResponse('[1,2,3]'), /Format du plan repas invalide/)
})

test('generateMealPlan parses model response', async () => {
  process.env.GOOGLE_API_KEY = 'test'
  process.env.GEMINI_MODEL = 'test-model'
  const { generateMealPlan, setModel } = await import(modulePath)
  const mockModel: ReturnType<GoogleGenerativeAI['getGenerativeModel']> = {
    generateContent: async () => ({ response: { text: () => '{"days":[]}' } }) as any,
  } as any
  setModel(mockModel)
  const result = await generateMealPlan('prompt')
  assert.deepEqual(result, { days: [] })
  setModel(null)
})

test('analyzeNutrition parses model response', async () => {
  process.env.GOOGLE_API_KEY = 'test'
  process.env.GEMINI_MODEL = 'test-model'
  const { analyzeNutrition, setModel } = await import(modulePath)
  const mockModel: ReturnType<GoogleGenerativeAI['getGenerativeModel']> = {
    generateContent: async () => ({
      response: { text: () => '{"kcal":100,"protein":1,"carbs":2,"fat":3,"fiber":4,"sugar":5,"sodium":6} extra' }
    }) as any
  } as any
  setModel(mockModel)
  const result = await analyzeNutrition('test food')
  assert.deepEqual(result, { kcal: 100, protein: 1, carbs: 2, fat: 3, fiber: 4, sugar: 5, sodium: 6 })
  setModel(null)
})

test('analyzeNutrition rejects incomplete data', async () => {
  process.env.GOOGLE_API_KEY = 'test'
  process.env.GEMINI_MODEL = 'test-model'
  const { analyzeNutrition, setModel } = await import(modulePath)
  const mockModel: ReturnType<GoogleGenerativeAI['getGenerativeModel']> = {
    generateContent: async () => ({
      response: { text: () => '{"kcal":100}'}
    }) as any
  } as any
  setModel(mockModel)
  await assert.rejects(() => analyzeNutrition('bad'), /Format de l'analyse nutritionnelle invalide/)
  setModel(null)
})

test('generateMealPlan rejects oversized responses', async () => {
  process.env.GOOGLE_API_KEY = 'test'
  process.env.GEMINI_MODEL = 'test-model'
  const { generateMealPlan, setModel, MAX_RESPONSE_LENGTH } = await import(modulePath)
  const large = 'a'.repeat(MAX_RESPONSE_LENGTH + 1)
  const mockModel: ReturnType<GoogleGenerativeAI['getGenerativeModel']> = {
    generateContent: async () => ({ response: { text: () => large } }) as any
  } as any
  setModel(mockModel)
  await assert.rejects(() => generateMealPlan('prompt'), /Réponse Gemini trop volumineuse/)
  setModel(null)
})

test('analyzeNutrition rejects oversized responses', async () => {
  process.env.GOOGLE_API_KEY = 'test'
  process.env.GEMINI_MODEL = 'test-model'
  const { analyzeNutrition, setModel, MAX_RESPONSE_LENGTH } = await import(modulePath)
  const large = 'a'.repeat(MAX_RESPONSE_LENGTH + 1)
  const mockModel: ReturnType<GoogleGenerativeAI['getGenerativeModel']> = {
    generateContent: async () => ({ response: { text: () => large } }) as any
  } as any
  setModel(mockModel)
  await assert.rejects(() => analyzeNutrition('food'), /Réponse Gemini trop volumineuse/)
  setModel(null)
})
