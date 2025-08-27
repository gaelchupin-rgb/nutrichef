import { test } from 'node:test'
import assert from 'node:assert/strict'

import { optimizeShopping } from '../optimizer'

test('throws when combinations exceed limit', () => {
  const needs = [{ id: '1', name: 'a', quantity: 1, unit: 'unit' }]
  const offers = Array.from({ length: 13 }, (_, i) => ({
    storeId: `s${i}`,
    productId: 'p',
    storeName: `S${i}`,
    productName: 'a',
    price: 1,
    unit: 'unit',
    quantity: 1,
  }))
  assert.throws(
    () => optimizeShopping(needs, offers, 13),
    /Too many store combinations/,
  )
})
