import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { getPrisma } from './db'
import { compare } from 'bcryptjs'
import { z } from 'zod'
import { rateLimit } from './rate-limit'
import { getIP } from './ip'
import { logger } from './logger'

const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
})
export async function authorize(
  credentials: { email: string; password: string },
  req?: Request | any,
) {
  const limit = await rateLimit(req)
  if (!limit.ok) throw new Error('Too many attempts')
  const prisma = getPrisma()
  const email = credentials.email.trim().toLowerCase()
  const user = await prisma.user.findUnique({
    where: { email },
  })
  if (!user) return null
  let isValid = false
  try {
    isValid = await compare(credentials.password, user.password)
  } catch (error) {
    const ip = getIP(req)
    logger.error(
      { err: error, userId: user.id, ip },
      'Error comparing password',
    )
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
        password: { label: 'Password', type: 'password' },
      },
      async authorize(rawCredentials, req) {
        const parsed = credentialsSchema.safeParse(rawCredentials)
        if (!parsed.success) return null
        return authorize(parsed.data, req)
      },
    }),
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
    },
  },
}
