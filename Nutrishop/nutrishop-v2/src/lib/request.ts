import { NextRequest } from 'next/server'

export class PayloadTooLargeError extends Error {
  constructor() {
    super('Payload too large')
  }
}

export class InvalidJsonError extends Error {
  constructor() {
    super('Invalid JSON')
  }
}

export async function readJsonBody(req: NextRequest, maxBytes: number) {
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
    return JSON.parse(text)
  } catch {
    throw new InvalidJsonError()
  }
}
