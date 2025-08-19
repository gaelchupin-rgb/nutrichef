import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  generateCombinations,
  generateRecommendations,
  filterOutliers,
  normalizeToBaseUnit,
  namesMatch,
} from '../optimizer'

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

test('normalizeToBaseUnit converts imperial and litre units', () => {
  const lb = normalizeToBaseUnit(1, 'lb')!
  assert.equal(lb.baseUnit, 'g')
  assert.ok(Math.abs(lb.value - 453.592) < 0.001)

  const oz = normalizeToBaseUnit(1, 'OZ')!
  assert.equal(oz.baseUnit, 'g')
  assert.ok(Math.abs(oz.value - 28.3495) < 0.001)

  const litre = normalizeToBaseUnit(2, 'Litres')!
  assert.equal(litre.baseUnit, 'ml')
  assert.equal(litre.value, 2000)
})

test('namesMatch handles token order and minor differences', () => {
  assert.ok(namesMatch('tomato sauce', 'sauce tomate'))
  assert.ok(!namesMatch('tomato sauce', 'apple'))
})
