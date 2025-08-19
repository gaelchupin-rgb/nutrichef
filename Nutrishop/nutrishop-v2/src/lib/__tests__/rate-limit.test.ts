import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rateLimit, store } from '../../middleware/rate-limit'

test('rateLimit blocks after threshold', () => {
  const req = new Request('http://test')
  for (let i = 0; i < 5; i++) {
    const res = rateLimit(req as any)
    assert.ok(res.ok)
  }
  const res = rateLimit(req as any)
  assert.ok(!res.ok)
})

test('purges expired records', () => {
  store.set('old', { count: 1, expires: Date.now() - 1000 })
  const req = new Request('http://test')
  rateLimit(req as any)
  assert.ok(!store.has('old'))
})
