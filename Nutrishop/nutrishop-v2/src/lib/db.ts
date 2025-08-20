import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

export function getPrisma() {
  if (!globalForPrisma.prisma) {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is required')
    }
    globalForPrisma.prisma = new PrismaClient({
      datasources: { db: { url: databaseUrl } }
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
