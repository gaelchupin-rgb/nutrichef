import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseMealPlanResponse } from '../gemini'

test('parseMealPlanResponse throws on invalid JSON', () => {
  assert.throws(() => parseMealPlanResponse('not json'))
})
