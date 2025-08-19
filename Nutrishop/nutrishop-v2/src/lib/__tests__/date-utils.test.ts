import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isValidDateRange, hasValidMealDates } from '../date-utils'

test('isValidDateRange detects reversed range', () => {
  assert.ok(!isValidDateRange('2024-01-05', '2024-01-01'))
})

test('hasValidMealDates rejects malformed dates', () => {
  assert.ok(!hasValidMealDates([{ date: 'not-a-date' }]))
  assert.ok(!hasValidMealDates([{ date: '2024-1-01' }]))
})

test('isValidDateRange validates format', () => {
  assert.ok(!isValidDateRange('2024-13-01', '2024-01-01'))
  assert.ok(!isValidDateRange('2024-01-01', '2024-1-02'))
})
