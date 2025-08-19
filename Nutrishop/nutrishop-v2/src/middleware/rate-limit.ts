import { NextRequest } from 'next/server'

interface RateRecord {
  count: number
  expires: number
}

const WINDOW_MS = 60_000
const MAX_REQUESTS = 5
const store = new Map<string, RateRecord>()

function getIP(req: NextRequest) {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0] ||
    (req as any).ip ||
    '127.0.0.1'
  )
}

export function rateLimit(
  req: NextRequest,
  limit: number = MAX_REQUESTS,
  windowMs: number = WINDOW_MS
) {
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
