import { NextRequest } from 'next/server'
import { isIP } from 'node:net'
import { getRedis } from '@/lib/redis'

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

/**
 * Extract the client IP from common proxy headers or the request object.
 * Falls back to 127.0.0.1 when no information is available.
 */
function getIP(req: NextRequest) {
  const candidates = [
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
    req.headers.get('x-real-ip')?.trim(),
    (req as any).ip,
  ]

  for (const ip of candidates) {
    if (ip && isIP(ip)) return ip
  }
  return '127.0.0.1'
}

export async function rateLimit(
  req: NextRequest,
  limit: number = MAX_REQUESTS,
  windowMs: number = WINDOW_MS
) {
  const ip = getIP(req)
  const now = Date.now()
  const redis = getRedis()

  if (redis) {
    const key = `rate:${ip}`
    const count = await redis.incr(key)
    if (count === 1) {
      await redis.pexpire(key, windowMs)
    }
    const ttl = await redis.pttl(key)
    if (count > limit) {
      return { ok: false, remaining: 0, reset: now + ttl }
    }
    return { ok: true, remaining: limit - count, reset: now + ttl }
  }

  const record = store.get(ip)
  if (!record || now > record.expires) {
    store.set(ip, { count: 1, expires: now + windowMs })
    return { ok: true, remaining: limit - 1, reset: now + windowMs }
  }
  if (record.count >= limit) {
    return { ok: false, remaining: 0, reset: record.expires }
  }
  record.count += 1
  return { ok: true, remaining: limit - record.count, reset: record.expires }
}
