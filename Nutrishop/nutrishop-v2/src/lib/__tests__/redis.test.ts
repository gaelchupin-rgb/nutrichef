import { test } from 'node:test'
import assert from 'node:assert/strict'

test('getRedis returns null on invalid URL', async () => {
  process.env.REDIS_URL = 'invalid'
  const mod = await import(`../redis?t=${Date.now()}`)
  const client = mod.getRedis()
  assert.equal(client, null)
})
