import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { GoogleGenerativeAI } from '@google/generative-ai'

const modulePath = '../gemini'

test('imports without env vars', () => {
  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', '-e', "import('./src/lib/gemini.ts')"],
    {
      env: { ...process.env, GEMINI_API_KEY: '' },
    },
  )
  assert.equal(result.status, 0)
})

test('generateMealPlan parses model response', async () => {
  process.env.GEMINI_API_KEY = 'test'
  const { generateMealPlan } = await import(modulePath)
  const mockModel: ReturnType<GoogleGenerativeAI['getGenerativeModel']> = {
    generateContent: async () =>
      ({ response: { text: () => '{"days":[]}' } }) as any,
  } as any
  const result = await generateMealPlan('prompt', mockModel)
  assert.deepEqual(result, { days: [] })
})

test('analyzeNutrition parses model response', async () => {
  process.env.GEMINI_API_KEY = 'test'
  const { analyzeNutrition } = await import(modulePath)
  const mockModel: ReturnType<GoogleGenerativeAI['getGenerativeModel']> = {
    generateContent: async () =>
      ({
        response: {
          text: () =>
            '{"kcal":100,"protein":1,"carbs":2,"fat":3,"fiber":4,"sugar":5,"sodium":6} extra',
        },
      }) as any,
  } as any
  const result = await analyzeNutrition('test food', mockModel)
  assert.deepEqual(result, {
    kcal: 100,
    protein: 1,
    carbs: 2,
    fat: 3,
    fiber: 4,
    sugar: 5,
    sodium: 6,
  })
})

test('analyzeNutrition rejects incomplete data', async () => {
  process.env.GEMINI_API_KEY = 'test'
  const { analyzeNutrition } = await import(modulePath)
  const mockModel: ReturnType<GoogleGenerativeAI['getGenerativeModel']> = {
    generateContent: async () =>
      ({
        response: { text: () => '{"kcal":100}' },
      }) as any,
  } as any
  await assert.rejects(
    () => analyzeNutrition('bad', mockModel),
    /Format d'analyse nutritionnelle invalide/,
  )
})

test('generateMealPlan rejects oversized responses', async () => {
  process.env.GEMINI_API_KEY = 'test'
  const { generateMealPlan, MAX_RESPONSE_LENGTH } = await import(modulePath)
  const large = 'a'.repeat(MAX_RESPONSE_LENGTH + 1)
  const mockModel: ReturnType<GoogleGenerativeAI['getGenerativeModel']> = {
    generateContent: async () => ({ response: { text: () => large } }) as any,
  } as any
  await assert.rejects(
    () => generateMealPlan('prompt', mockModel),
    /Réponse Gemini trop volumineuse/,
  )
})

test('analyzeNutrition rejects oversized responses', async () => {
  process.env.GEMINI_API_KEY = 'test'
  const { analyzeNutrition, MAX_RESPONSE_LENGTH } = await import(modulePath)
  const large = 'a'.repeat(MAX_RESPONSE_LENGTH + 1)
  const mockModel: ReturnType<GoogleGenerativeAI['getGenerativeModel']> = {
    generateContent: async () => ({ response: { text: () => large } }) as any,
  } as any
  await assert.rejects(
    () => analyzeNutrition('food', mockModel),
    /Réponse Gemini trop volumineuse/,
  )
})
