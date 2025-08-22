import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rateLimit, rateLimitByIP, store, cleanup } from '../rate-limit'

test('rateLimit blocks after threshold', async () => {
  store.clear()
  const req = new Request('http://test')
  for (let i = 0; i < 5; i++) {
    const res = await rateLimit(req as any)
    assert.ok(res.ok)
  }
  const res = await rateLimit(req as any)
  assert.ok(!res.ok)
})

test('rateLimitByIP works without request', async () => {
  store.clear()
  const ip = '203.0.113.9'
  for (let i = 0; i < 5; i++) {
    const res = await rateLimitByIP(ip)
    assert.ok(res.ok)
  }
  const res = await rateLimitByIP(ip)
  assert.ok(!res.ok)
})

test('purges expired records', () => {
  store.clear()
  store.set('old', { count: 1, expires: Date.now() - 1000 })
  cleanup()
  assert.ok(!store.has('old'))
})

test('uses x-real-ip header when present', async () => {
  store.clear()
  const req = new Request('http://test', {
    headers: { 'x-real-ip': '203.0.113.1' }
  })
  const res = await rateLimit(req as any)
  assert.ok(res.ok)
  assert.ok(store.has('203.0.113.1'))
})

test('trims whitespace in IP headers', async () => {
  store.clear()
  const req1 = new Request('http://test', {
    headers: { 'x-forwarded-for': ' 203.0.113.1 ' }
  })
  const req2 = new Request('http://test', {
    headers: { 'x-forwarded-for': '203.0.113.1' }
  })
  await rateLimit(req1 as any)
  await rateLimit(req2 as any)
  const record = store.get('203.0.113.1')
  assert.equal(record?.count, 2)
  assert.equal(store.size, 1)
})

test('falls back to loopback on invalid IP header', async () => {
  store.clear()
  const req = new Request('http://test', {
    headers: { 'x-real-ip': 'bad-ip' },
  })
  await rateLimit(req as any)
  assert.ok(store.has('127.0.0.1'))
})
