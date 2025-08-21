import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().optional(),
  MAX_STORE_COMBINATIONS: z.coerce.number().int().positive().default(100000),
})

const env = envSchema.parse(process.env)

export function getDatabaseUrl() {
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is required')
  try {
    new URL(env.DATABASE_URL)
  } catch {
    throw new Error('DATABASE_URL is invalid')
  }
  return env.DATABASE_URL
}

export function getRedisUrl() {
  return env.REDIS_URL
}

export function getGeminiConfig() {
  if (!env.GOOGLE_API_KEY) throw new Error('GOOGLE_API_KEY is required')
  if (!env.GEMINI_MODEL) throw new Error('GEMINI_MODEL is required')
  return { apiKey: env.GOOGLE_API_KEY, model: env.GEMINI_MODEL }
}

export function getMaxStoreCombinations() {
  return env.MAX_STORE_COMBINATIONS
}
