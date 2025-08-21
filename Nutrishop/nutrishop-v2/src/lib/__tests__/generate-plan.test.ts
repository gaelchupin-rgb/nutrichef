import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getPrisma } from '../db'
import { differenceInCalendarDays } from 'date-fns'
const prisma = getPrisma()

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
  const utils = await import(`../meal-plan?t=${Date.now()}`)
  let upsertArgs: any
  ;(prisma as any).$transaction = async (cb: any) => {
    return cb({
      plan: { create: async () => ({ id: 1 }) },
      recipe: {
        upsert: async (args: any) => {
          upsertArgs = args
          return { id: 1 }
        }
      },
      menuItem: { create: async () => {} },
    })
  }
  await utils.saveMealPlan(mealPlan as any, { cuisineType: 'classique' }, '1', '2024-01-01', '2024-01-02')
  assert.deepEqual(upsertArgs.where, { userId_name: { userId: '1', name: 'Omelette' } })
  assert.equal(upsertArgs.create.userId, '1')
})

test('saveMealPlan processes all meals', async () => {
  const utils = await import(`../meal-plan?t=${Date.now()}`)
  const calls: string[] = []
  ;(prisma as any).$transaction = async (cb: any) => {
    return cb({
      plan: { create: async () => ({ id: 1 }) },
      recipe: {
        upsert: async () => {
          calls.push('upsert')
          return { id: 1 }
        }
      },
      menuItem: {
        create: async () => {
          calls.push('create')
        }
      }
    })
  }
  await utils.saveMealPlan(mealPlan as any, { cuisineType: 'classique' }, '1', '2024-01-01', '2024-01-02')
  assert.equal(calls.filter((c) => c === 'upsert').length, 2)
  assert.equal(calls.filter((c) => c === 'create').length, 2)
})

test('datesWithinRange flags out-of-range dates', async () => {
  const utils = await import(`../meal-plan?t=${Date.now()}`)
  assert.equal(utils.datesWithinRange(outOfRangePlan.days, '2024-01-01', '2024-01-02'), false)
})

test('datesWithinRange rejects invalid dates', async () => {
  const utils = await import(`../meal-plan?t=${Date.now()}`)
  assert.equal(utils.datesWithinRange([{ date: 'invalid' }], '2024-01-01', '2024-01-02'), false)
})

test('returns 400 on invalid JSON', async () => {
  const session = await import(`../session?t=${Date.now()}`)
  session.setSessionGetter(async () => ({ user: { id: '1' } }))
  const route = await import(`../../app/api/ai/generate-plan/route?t=${Date.now()}`)
  const req = new Request('http://test', {
    method: 'POST',
    body: '{not json',
    headers: { 'content-type': 'application/json' },
  })
  const res = await route.POST(req as any)
  assert.equal(res.status, 400)
})

test('returns 415 on invalid Content-Type', async () => {
  const session = await import(`../session?t=${Date.now()}`)
  session.setSessionGetter(async () => ({ user: { id: '1' } }))
  const route = await import(`../../app/api/ai/generate-plan/route?t=${Date.now()}`)
  const req = new Request('http://test', {
    method: 'POST',
    body: JSON.stringify({ startDate: '2024-01-01', endDate: '2024-01-02' }),
    headers: { 'content-type': 'text/plain' },
  })
  const res = await route.POST(req as any)
  assert.equal(res.status, 415)
})

test('returns 413 on payload too large', async () => {
  const session = await import(`../session?t=${Date.now()}`)
  session.setSessionGetter(async () => ({ user: { id: '1' } }))
  const route = await import(`../../app/api/ai/generate-plan/route?t=${Date.now()}`)
  const large = 'a'.repeat(1_000_001)
  const req = new Request('http://test', {
    method: 'POST',
    body: large,
    headers: {
      'content-type': 'application/json',
      'content-length': '10',
      'x-real-ip': '203.0.113.10'
    }
  })
  const res = await route.POST(req as any)
  assert.equal(res.status, 413)
})

test('allows ranges up to 90 days', async () => {
  const session = await import(`../session?t=${Date.now()}`)
  const gemini = await import(`../gemini?t=${Date.now()}`)
  session.setSessionGetter(async () => ({ user: { id: '1' } }))
  ;(prisma as any).profile = {
    findUnique: async () => ({ cuisineType: null, appliances: [] }),
  }
  ;(prisma as any).$transaction = async (cb: any) => {
    return cb({
      plan: { create: async () => ({ id: 1 }) },
      recipe: { upsert: async () => ({ id: 1 }) },
      menuItem: { create: async () => {} },
    })
  }
  ;(gemini as any).setModel({
    generateContent: async () => ({
      response: { text: () => JSON.stringify(mealPlan) },
    }),
  })
  const route = await import(`../../app/api/ai/generate-plan/route?t=${Date.now()}`)
  const req = new Request('http://test', {
    method: 'POST',
    body: JSON.stringify({ startDate: '2024-01-01', endDate: '2024-03-31' }),
    headers: { 'content-type': 'application/json' },
  })
  const res = await route.POST(req as any)
  assert.equal(res.status, 200)
})

test('rejects ranges longer than 90 days', async () => {
  const session = await import(`../session?t=${Date.now()}`)
  session.setSessionGetter(async () => ({ user: { id: '1' } }))
  const route = await import(`../../app/api/ai/generate-plan/route?t=${Date.now()}`)
  const req = new Request('http://test', {
    method: 'POST',
    body: JSON.stringify({ startDate: '2024-01-01', endDate: '2024-04-01' }),
    headers: { 'content-type': 'application/json' },
  })
  const res = await route.POST(req as any)
  assert.equal(res.status, 400)
})

test('differenceInCalendarDays handles DST transition', () => {
  const start = new Date('2024-03-09')
  const end = new Date('2024-03-11')
  const diff = differenceInCalendarDays(end, start)
  assert.equal(diff, 2)
})

test('mealPlanSchema accepts numeric strings', async () => {
  const { mealPlanSchema } = await import('../meal-plan')
  const result = mealPlanSchema.safeParse({
    days: [
      {
        date: '2024-01-01',
        meals: [
          {
            name: 'Soup',
            instructions: [],
            type: 'lunch',
            prepTime: '10',
            cookTime: '20',
            servings: '2',
            nutrition: {
              kcal: '100',
              protein: '10',
              carbs: '20',
              fat: '5',
              fiber: '3',
              sugar: '1',
              sodium: '50',
            },
          },
        ],
      },
    ],
  })
  assert.ok(result.success)
  if (result.success) {
    assert.equal(typeof result.data.days[0].meals[0].nutrition.kcal, 'number')
  }
})
