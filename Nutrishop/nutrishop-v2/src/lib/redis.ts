import Redis from 'ioredis'

let client: Redis | null = null

export function getRedis() {
  const url = process.env.REDIS_URL
  if (!url) return null
  if (!client) {
    try {
      new URL(url)
      client = new Redis(url)
    } catch (err) {
      console.error('Failed to connect to Redis:', err)
      client = null
      return null
    }
  }
  return client
}

export async function disconnectRedis() {
  if (client) {
    await client.quit()
    client = null
  }
}
