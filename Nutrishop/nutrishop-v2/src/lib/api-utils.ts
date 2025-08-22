import type { NextRequest } from 'next/server'
import { parseJsonRequest } from './http'

export const DEFAULT_MAX_JSON_SIZE = 1_000_000

export async function parseJsonBody<T>(
  req: NextRequest,
  options?: { maxBytes?: number }
) {
  const maxBytes = options?.maxBytes ?? DEFAULT_MAX_JSON_SIZE
  return parseJsonRequest<T>(req, maxBytes)
}
