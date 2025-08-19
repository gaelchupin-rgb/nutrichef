import { test } from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { rateLimit } from '../../middleware/rate-limit'

test('rateLimit blocks after threshold', () => {
  const req = new NextRequest('http://test')
  for (let i = 0; i < 5; i++) {
    const res = rateLimit(req)
    assert.ok(res.ok)
  }
  const res = rateLimit(req)
  assert.ok(!res.ok)
})
