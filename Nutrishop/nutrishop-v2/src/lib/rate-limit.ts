import type { NextRequest } from 'next/server'
import { getRedis } from './redis'
import { getIP } from './ip'

interface RateRecord {
  count: number
  expires: number
}

const WINDOW_MS = 60_000
const MAX_REQUESTS = 5

// In-memory fallback store used when Redis is not configured
export const store = new Map<string, RateRecord>()

export function cleanup() {
  const now = Date.now()
  for (const [key, record] of store.entries()) {
    if (record.expires <= now) {
      store.delete(key)
    }
  }
}
declare global {
  // Flag to ensure cleanup interval is only registered once across reloads
  var __rateLimitCleanupSet: boolean | undefined
}

if (!globalThis.__rateLimitCleanupSet) {
  setInterval(cleanup, WINDOW_MS).unref?.()
  globalThis.__rateLimitCleanupSet = true
}

export async function rateLimitByIP(
  ip: string,
  key?: string,
  limit: number = MAX_REQUESTS,
  windowMs: number = WINDOW_MS,
) {
  const now = Date.now()
  const redis = getRedis()
  const id = key ? `${ip}:${key}` : ip

  if (redis) {
    const redisKey = `rate:${id}`
    const count = await redis.incr(redisKey)
    if (count === 1) {
      await redis.pexpire(redisKey, windowMs)
    }
    const ttl = await redis.pttl(redisKey)
    if (count > limit) {
      return { ok: false, remaining: 0, reset: now + ttl }
    }
    return { ok: true, remaining: limit - count, reset: now + ttl }
  }

  const record = store.get(id)
  if (!record || now > record.expires) {
    store.set(id, { count: 1, expires: now + windowMs })
    return { ok: true, remaining: limit - 1, reset: now + windowMs }
  }
  if (record.count >= limit) {
    return { ok: false, remaining: 0, reset: record.expires }
  }
  record.count += 1
  return { ok: true, remaining: limit - record.count, reset: record.expires }
}

export async function rateLimit(
  req?: Request | NextRequest,
  limit: number = MAX_REQUESTS,
  windowMs: number = WINDOW_MS,
) {
  const ip = getIP(req)
  const pathname =
    (req as any)?.nextUrl?.pathname ??
    (req ? new URL(req.url).pathname : undefined)
  return rateLimitByIP(ip, pathname, limit, windowMs)
}
