import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isValidDateRange, hasValidMealDates } from '../date-utils'

test('isValidDateRange detects reversed range', () => {
  assert.ok(!isValidDateRange('2024-01-05', '2024-01-01'))
})

test('hasValidMealDates rejects malformed dates', () => {
  assert.ok(!hasValidMealDates([{ date: 'not-a-date' }]))
})
