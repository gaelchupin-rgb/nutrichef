import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().optional(),
  MAX_STORE_COMBINATIONS: z.coerce.number().int().positive().default(5000),
})

let env: z.infer<typeof envSchema>

export function getEnv() {
  if (!env) {
    env = envSchema.parse(process.env)
  }
  return env
}
