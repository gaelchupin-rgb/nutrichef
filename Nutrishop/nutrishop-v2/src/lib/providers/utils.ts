import extract from 'extract-json-from-string'
import { jsonrepair } from 'jsonrepair'

export const MAX_RESPONSE_LENGTH = 100_000

export function parseMealPlanResponse(text: string) {
  const cleaned = text.replace(/```(?:json)?|```/gi, '').trim()

  const extracted = extract(cleaned)
  if (Array.isArray(extracted)) {
    for (const item of extracted) {
      if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
        return item
      }
    }
  }

  const startObj = cleaned.indexOf('{')
  const endObj = cleaned.lastIndexOf('}')
  if (startObj !== -1 && endObj !== -1) {
    try {
      const obj = JSON.parse(jsonrepair(cleaned.slice(startObj, endObj + 1)))
      if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
        return obj
      }
    } catch {}
  }

  throw new Error('Format du plan repas invalide')
}
