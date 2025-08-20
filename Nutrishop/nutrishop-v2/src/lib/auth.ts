import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { getPrisma } from './db'
import { compare } from 'bcryptjs'

export async function authorize(credentials: any) {
  if (!credentials?.email || !credentials?.password) return null
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
      authorize
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
