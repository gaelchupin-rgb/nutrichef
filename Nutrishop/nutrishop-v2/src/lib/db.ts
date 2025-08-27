import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

export function getPrisma() {
  if (!globalForPrisma.prisma) {
    const DATABASE_URL = process.env.DATABASE_URL
    if (!DATABASE_URL) throw new Error('DATABASE_URL is required')
    try {
      new URL(DATABASE_URL)
    } catch {
      throw new Error('DATABASE_URL is invalid')
    }
    globalForPrisma.prisma = new PrismaClient({
      datasources: { db: { url: DATABASE_URL } },
    })
  }
  return globalForPrisma.prisma
}

export const prisma = getPrisma()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

const disconnect = async () => {
  try {
    await prisma.$disconnect()
  } catch (error) {
    console.error('Error disconnecting Prisma', error)
  }
}
const flag = '__prismaListenersRegistered'
if (!(globalThis as any)[flag]) {
  ;(globalThis as any)[flag] = true
  process.once('beforeExit', disconnect)
  process.once('SIGTERM', disconnect)
  process.once('SIGINT', disconnect)
}
