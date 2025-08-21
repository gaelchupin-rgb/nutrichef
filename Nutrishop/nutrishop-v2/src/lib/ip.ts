import { isIP } from 'node:net'

export function getIP(req?: { headers?: any; ip?: string }) {
  const headers = req?.headers
  const getHeader = (name: string) => {
    if (!headers) return undefined
    if (typeof headers.get === 'function') return headers.get(name)
    return headers[name] || headers[name.toLowerCase()]
  }
  const candidates = [
    getHeader('x-forwarded-for')?.split(',')[0]?.trim(),
    getHeader('x-real-ip')?.trim(),
    req?.ip,
  ]
  for (const ip of candidates) {
    if (ip && isIP(ip)) return ip
  }
  return '127.0.0.1'
}
