import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  generateCombinations,
  generateRecommendations,
  filterOutliers,
  normalizeToBaseUnit,
  namesMatch,
  optimizeShopping,
  UnknownUnitError,
  classifyShoppingNeeds,
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
    [],
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

test('normalizeToBaseUnit converts various units', () => {
  const lb = normalizeToBaseUnit(1, 'lb') as any
  assert.equal(lb.baseUnit, 'g')
  assert.ok(Math.abs(lb.value - 453.592) < 0.001)

  const oz = normalizeToBaseUnit(1, 'OZ') as any
  assert.equal(oz.baseUnit, 'g')
  assert.ok(Math.abs(oz.value - 28.3495) < 0.001)

  const litre = normalizeToBaseUnit(2, 'Litres') as any
  assert.equal(litre.baseUnit, 'ml')
  assert.equal(litre.value, 2000)

  const kilo = normalizeToBaseUnit(1, 'kilogrammes') as any
  assert.equal(kilo.baseUnit, 'g')
  assert.equal(kilo.value, 1000)

  const ml = normalizeToBaseUnit(500, 'milliliters') as any
  assert.equal(ml.baseUnit, 'ml')
  assert.equal(ml.value, 500)

  const mg = normalizeToBaseUnit(5000, 'mg') as any
  assert.equal(mg.baseUnit, 'g')
  assert.equal(mg.value, 5)

  const cl = normalizeToBaseUnit(2, 'centilitre') as any
  assert.equal(cl.baseUnit, 'ml')
  assert.equal(cl.value, 20)

  const pcs = normalizeToBaseUnit(3, 'pcs') as any
  assert.equal(pcs.baseUnit, 'unit')
  assert.equal(pcs.value, 3)
})

test('normalizeToBaseUnit trims whitespace', () => {
  const kg = normalizeToBaseUnit(1, ' kg ') as any
  assert.equal(kg.baseUnit, 'g')
  assert.equal(kg.value, 1000)
})

test('normalizeToBaseUnit returns error for unknown units', () => {
  const res = normalizeToBaseUnit(1, 'unknown')
  assert.ok(res instanceof UnknownUnitError)
})

test('optimizeShopping throws on unknown unit', () => {
  const needs = [{ id: '1', name: 'a', quantity: 1, unit: 'unknown' }]
  const offers = [
    {
      storeId: 's1',
      productId: 'p',
      storeName: 'S1',
      productName: 'a',
      price: 1,
      unit: 'unit',
      quantity: 1,
    },
  ]
  assert.throws(() => optimizeShopping(needs, offers), UnknownUnitError)
})

test('namesMatch handles token order and minor differences', () => {
  assert.ok(namesMatch('tomato sauce', 'sauce tomate'))
  assert.ok(!namesMatch('tomato sauce', 'apple'))
})

test('namesMatch requires bidirectional token matches', () => {
  assert.ok(!namesMatch('sauce tomate', 'tomate'))
})

test('classifyShoppingNeeds splits fresh and dry', () => {
  const needs: any[] = [
    { id: '1', name: 'Lait', quantity: 1, unit: 'l' },
    { id: '2', name: 'Pâtes', quantity: 500, unit: 'g' },
  ]
  const res = classifyShoppingNeeds(needs)
  assert.equal(res.fresh.length, 1)
  assert.equal(res.dry.length, 1)
  assert.equal(res.fresh[0].id, '1')
  assert.equal(needs[0].category, 'fresh')
})
