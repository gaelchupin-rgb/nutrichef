import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

const databaseUrl =
  process.env.DATABASE_URL ||
  'postgresql://user:pass@localhost:5432/test'

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: { db: { url: databaseUrl } }
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
