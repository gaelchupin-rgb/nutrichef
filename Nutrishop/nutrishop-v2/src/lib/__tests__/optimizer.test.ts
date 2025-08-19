import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateCombinations } from '../optimizer'

test('generateCombinations returns all combinations', () => {
  const results: string[][] = []
  generateCombinations(['a', 'b', 'c'], 2, 0, [], results)
  assert.equal(results.length, 3)
  assert.deepStrictEqual(results.sort(), [
    ['a', 'b'],
    ['a', 'c'],
    ['b', 'c'],
  ])
})
