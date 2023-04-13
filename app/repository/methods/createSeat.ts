import type { PrismaClient } from '@prisma/client'
import type { Repository } from '../types'

export const createSeat =
  (prisma: PrismaClient): Repository['seat']['create'] =>
  async (furnitureId, spaceId) => {
    const space = await prisma.space.findUnique({ where: { id: spaceId } })

    if (!space) throw new Error('Space not found')

    const result = await prisma.seat.create({
      data: { furnitureId, spacePK: space?.PK },
      include: {
        reservations: {
          include: { by: { include: { photos: true } }, seat: true },
        },
      },
    })

    return result
  }
