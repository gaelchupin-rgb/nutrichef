import { getPrisma } from './db'
const prisma = getPrisma()

async function main() {
  await prisma.profile.create({ data: {} })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
