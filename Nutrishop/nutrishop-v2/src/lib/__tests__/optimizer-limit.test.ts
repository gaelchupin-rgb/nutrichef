import { test } from 'node:test'
import assert from 'node:assert/strict'

test('throws when combinations exceed limit', async () => {
  process.env.MAX_STORE_COMBINATIONS = '1'
  const { optimizeShopping } = await import('../optimizer')
  const needs = [{ id: '1', name: 'a', quantity: 1, unit: 'unit' }]
  const offers = [
    { storeId: 's1', productId: 'p', storeName: 'S1', productName: 'a', price: 1, unit: 'unit', quantity: 1 },
    { storeId: 's2', productId: 'p', storeName: 'S2', productName: 'a', price: 1, unit: 'unit', quantity: 1 },
  ]
  assert.throws(() => optimizeShopping(needs, offers, 2), /Too many store combinations/)
})
