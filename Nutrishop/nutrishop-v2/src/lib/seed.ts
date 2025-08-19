import { getPrisma } from './db'
const prisma = getPrisma()
import bcrypt from 'bcryptjs'

async function main() {
  const password = await bcrypt.hash('password', 12)
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: { password },
    create: {
      email: 'test@example.com',
      username: 'test',
      password
    }
  })
  await prisma.profile.upsert({
    where: { userId: user.id },
    update: { userId: user.id },
    create: { userId: user.id }
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
