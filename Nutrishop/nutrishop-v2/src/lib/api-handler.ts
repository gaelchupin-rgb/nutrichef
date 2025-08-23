import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from './rate-limit'
import { parseJsonBody } from './api-utils'
import {
  PayloadTooLargeError,
  InvalidJsonError,
  PAYLOAD_TOO_LARGE,
  JSON_INVALIDE,
  TOO_MANY_REQUESTS,
} from './errors'

export function handleJsonRoute<T>(
  handler: (json: T, req: NextRequest) => Promise<NextResponse>,
) {
  return async (req: NextRequest) => {
    const limit = await rateLimit(req)
    const retryAfter = Math.ceil((limit.reset - Date.now()) / 1000)
    if (!limit.ok) {
      const res = NextResponse.json(
        { error: TOO_MANY_REQUESTS },
        { status: 429 },
      )
      res.headers.set('X-RateLimit-Remaining', String(limit.remaining))
      res.headers.set('Retry-After', String(retryAfter))
      return res
    }
    try {
      const parsedReq = await parseJsonBody<T>(req)
      if (!parsedReq.ok) {
        return NextResponse.json(
          { error: 'Content-Type invalide' },
          { status: 415 },
        )
      }
      const res = await handler(parsedReq.data, req)
      res.headers.set('X-RateLimit-Remaining', String(limit.remaining))
      res.headers.set('Retry-After', String(retryAfter))
      return res
    } catch (err) {
      if (err instanceof PayloadTooLargeError) {
        return NextResponse.json({ error: PAYLOAD_TOO_LARGE }, { status: 413 })
      }
      if (err instanceof InvalidJsonError) {
        return NextResponse.json({ error: JSON_INVALIDE }, { status: 400 })
      }
      throw err
    }
  }
}
