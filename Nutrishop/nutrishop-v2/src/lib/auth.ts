import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { getPrisma } from './db'
import { compare } from 'bcryptjs'
import { z } from 'zod'
import { rateLimit } from '@/middleware/rate-limit'
import { isIP } from 'node:net'

const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
})
function getIP(req?: { headers?: any; ip?: string }) {
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

export async function authorize(credentials: { email: string; password: string }, req?: Request | any) {
  const ip = getIP(req)
  const limit = await rateLimit(new Request('http://auth', { headers: { 'x-real-ip': ip } }) as any)
  if (!limit.ok) throw new Error('Too many attempts')
  const prisma = getPrisma()
  const email = credentials.email.trim().toLowerCase()
  const user = await prisma.user.findUnique({
    where: { email }
  })
  if (!user) return null
  let isValid = false
  try {
    isValid = await compare(credentials.password, user.password)
  } catch (error) {
    console.error('Error comparing password:', error)
    return null
  }
  if (!isValid) return null
  return { id: user.id, email: user.email, name: user.username }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(rawCredentials, req) {
        const parsed = credentialsSchema.safeParse(rawCredentials)
        if (!parsed.success) return null
        return authorize(parsed.data, req)
      }
    })
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string
      }
      return session
    }
  }
}
