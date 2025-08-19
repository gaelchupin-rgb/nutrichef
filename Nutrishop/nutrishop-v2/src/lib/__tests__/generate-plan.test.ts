import { test } from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { prisma } from '../db'

const mealPlan = {
  days: [
    {
      date: '2024-01-01',
      meals: [
        {
          name: 'Omelette',
          instructions: [],
          type: 'breakfast',
          nutrition: { kcal: 1, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 },
        },
      ],
    },
    {
      date: '2024-01-02',
      meals: [
        {
          name: 'Omelette',
          instructions: [],
          type: 'breakfast',
          nutrition: { kcal: 1, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 },
        },
      ],
    },
  ],
}

const outOfRangePlan = {
  days: [
    {
      date: '2024-01-03',
      meals: [
        {
          name: 'Omelette',
          instructions: [],
          type: 'breakfast',
          nutrition: { kcal: 1, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 },
        },
      ],
    },
  ],
}

test('saveMealPlan avoids duplicate recipe errors', async () => {
  const route = await import(`../../app/api/ai/generate-plan/route?t=${Date.now()}`)
  ;(prisma as any).$transaction = async (cb: any) => {
    return cb({
      plan: { create: async () => ({ id: 1 }) },
      recipe: { upsert: async () => ({ id: 1 }) },
      menuItem: { create: async () => {} },
    })
  }
  await route.saveMealPlan(mealPlan as any, { cuisineType: 'classique' }, '1', '2024-01-01', '2024-01-02')
})

test('datesWithinRange flags out-of-range dates', async () => {
  const route = await import(`../../app/api/ai/generate-plan/route?t=${Date.now()}`)
  assert.equal(route.datesWithinRange(outOfRangePlan.days, '2024-01-01', '2024-01-02'), false)
})

test('returns 400 on invalid JSON', async () => {
  const route = await import(`../../app/api/ai/generate-plan/route?t=${Date.now()}`)
  route.sessionFetcher.get = async () => ({ user: { id: '1' } })
  const req = new NextRequest('http://test', {
    method: 'POST',
    body: '{not json',
    headers: { 'content-type': 'application/json' },
  })
  const res = await route.POST(req)
  assert.equal(res.status, 400)
})
