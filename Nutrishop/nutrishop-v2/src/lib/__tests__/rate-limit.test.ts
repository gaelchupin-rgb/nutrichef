import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rateLimit, store } from '../../middleware/rate-limit'

test('rateLimit blocks after threshold', () => {
  store.clear()
  const req = new Request('http://test')
  for (let i = 0; i < 5; i++) {
    const res = rateLimit(req as any)
    assert.ok(res.ok)
  }
  const res = rateLimit(req as any)
  assert.ok(!res.ok)
})

test('purges expired records', () => {
  store.clear()
  store.set('old', { count: 1, expires: Date.now() - 1000 })
  const req = new Request('http://test')
  rateLimit(req as any)
  assert.ok(!store.has('old'))
})

test('uses x-real-ip header when present', () => {
  store.clear()
  const req = new Request('http://test', {
    headers: { 'x-real-ip': '203.0.113.1' }
  })
  const res = rateLimit(req as any)
  assert.ok(res.ok)
  assert.ok(store.has('203.0.113.1'))
})
