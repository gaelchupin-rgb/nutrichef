import Redis from 'ioredis'

let client: Redis | null = null

export function getRedis() {
  const url = process.env.REDIS_URL
  if (!url) return null
  if (!client) {
    client = new Redis(url)
  }
  return client
}

export async function disconnectRedis() {
  if (client) {
    await client.quit()
    client = null
  }
}
