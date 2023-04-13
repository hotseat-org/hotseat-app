import type { PrismaClient } from '@prisma/client'
import type { Repository } from '../types'

export const findSeats =
  (prisma: PrismaClient): Repository['seat']['findMany'] =>
  async (spaceId) => {
    const space = await prisma.space.findUnique({ where: { id: spaceId } })

    if (!space) throw new Error('Space not found')

    const result = await prisma.seat.findMany({
      where: { spacePK: space.PK },
      include: {
        resident: { include: { photos: true } },
        reservations: {
          include: { by: { include: { photos: true } }, seat: true },
        },
      },
    })

    return result
  }
