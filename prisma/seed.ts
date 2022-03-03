import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const seed = async () => {
  await prisma.user.create({
    data: {
      email: 'vidlec@gmail.com',
      name: 'Pepa Vidlák',
    },
  })
}

seed()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
