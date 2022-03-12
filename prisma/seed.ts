import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const rowSeats = {
  0: 5,
  1: 4,
  2: 2,
  3: 2,
  4: 3,
  5: 3,
  6: 5,
}

const seed = async () => {
  const createSeats = Object.entries(rowSeats).map(([key, seatsCount]) => {
    const rowIndex = parseInt(key, 10)

    return prisma.seat.createMany({
      data: Array.from({ length: seatsCount }).map((_, index) => ({
        row: rowIndex,
        index,
      })),
    })
  })

  await Promise.all(createSeats)
}

seed()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
