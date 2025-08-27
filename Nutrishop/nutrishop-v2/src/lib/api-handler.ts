import { NextRequest, NextResponse } from 'next/server'
import { parseJsonBody } from './api-utils'
import {
  PayloadTooLargeError,
  InvalidJsonError,
  PAYLOAD_TOO_LARGE,
  JSON_INVALIDE,
} from './errors'

export function handleJsonRoute<T>(
  handler: (json: T, req: NextRequest) => Promise<NextResponse>,
) {
  return async (req: NextRequest) => {
    try {
      const parsedReq = await parseJsonBody<T>(req)
      if (!parsedReq.ok) {
        return NextResponse.json(
          { error: 'Content-Type invalide' },
          { status: 415 },
        )
      }
      return await handler(parsedReq.data, req)
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
