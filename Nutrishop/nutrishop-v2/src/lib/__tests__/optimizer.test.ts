import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateCombinations, generateRecommendations } from '../optimizer'

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

test('generateRecommendations omits distance warning with no stores', () => {
  const recs = generateRecommendations(
    { stores: [], items: [], total: 0, savings: 0 },
    []
  )
  assert.ok(!recs.some((r) => r.includes('magasins sont à plus')))
})
