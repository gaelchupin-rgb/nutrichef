import { NextRequest } from 'next/server'

interface RateRecord {
  count: number
  expires: number
}

const WINDOW_MS = 60_000
const MAX_REQUESTS = 5

export const store = new Map<string, RateRecord>()

function cleanup() {
  const now = Date.now()
  for (const [key, record] of store.entries()) {
    if (record.expires <= now) {
      store.delete(key)
    }
  }
}

setInterval(cleanup, WINDOW_MS).unref?.()

/**
 * Extract the client IP from common proxy headers or the request object.
 * Falls back to 127.0.0.1 when no information is available.
 */
function getIP(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip')?.trim() ||
    (req as any).ip ||
    '127.0.0.1'

  return String(ip).trim()
}

export function rateLimit(
  req: NextRequest,
  limit: number = MAX_REQUESTS,
  windowMs: number = WINDOW_MS
) {
  cleanup()
  const ip = getIP(req)
  const now = Date.now()
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
