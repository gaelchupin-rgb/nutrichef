import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateCombinations, generateRecommendations, filterOutliers } from '../optimizer'

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

test('filterOutliers keeps free offers', () => {
  const offers = [
    {
      storeId: '1',
      productId: '1',
      storeName: 'A',
      productName: 'X',
      price: 0,
      unit: 'g',
      quantity: 100,
    },
    {
      storeId: '2',
      productId: '1',
      storeName: 'B',
      productName: 'X',
      price: 1,
      unit: 'g',
      quantity: 100,
    },
    {
      storeId: '3',
      productId: '1',
      storeName: 'C',
      productName: 'X',
      price: 2,
      unit: 'g',
      quantity: 100,
    },
  ]
  const res = filterOutliers(offers)
  assert.ok(res.some((o) => o.price === 0))
})
