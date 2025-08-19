import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required')
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: { db: { url: databaseUrl } }
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
