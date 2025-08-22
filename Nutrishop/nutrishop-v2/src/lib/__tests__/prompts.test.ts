import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildMealPlanPrompt } from '../prompts'
import { mealPlanSchema } from '../meal-plan'

test('buildMealPlanPrompt example matches schema', () => {
  const prompt = buildMealPlanPrompt({ appliances: [] }, '2024-01-01', '2024-01-02')
  const match = prompt.match(/\{[\s\S]*\}$/)
  assert.ok(match)
  const obj = JSON.parse(match![0])
  const parsed = mealPlanSchema.safeParse(obj)
  assert.ok(parsed.success)
})
