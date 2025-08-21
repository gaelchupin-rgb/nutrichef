import { NextRequest } from 'next/server'
import {
  PAYLOAD_TOO_LARGE,
  JSON_INVALIDE,
  REPONSE_NON_JSON,
  REPONSE_JSON_INVALIDE,
  ERREUR_INCONNUE,
  PayloadTooLargeError,
  InvalidJsonError,
} from './errors'

export async function readJsonBody<T>(
  req: NextRequest,
  maxBytes: number
): Promise<T> {
  const reader = req.body?.getReader()
  if (!reader) {
    throw new InvalidJsonError()
  }
  const decoder = new TextDecoder()
  let size = 0
  let text = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > maxBytes) {
      throw new PayloadTooLargeError()
    }
    text += decoder.decode(value, { stream: true })
  }
  text += decoder.decode()
  try {
    return JSON.parse(text) as T
  } catch {
    throw new InvalidJsonError()
  }
}

export async function fetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(input, init)
  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    const text = await res.text().catch(() => '')
    throw new Error(text || REPONSE_NON_JSON)
  }
  let data: T
  try {
    data = await res.json()
  } catch {
    throw new Error(REPONSE_JSON_INVALIDE)
  }
  if (!res.ok) {
    throw new Error((data as any)?.error || ERREUR_INCONNUE)
  }
  return data
}
