import type { PrismaClient } from '@prisma/client'
import type { Repository } from '../types'

export const findSeat =
  (prisma: PrismaClient): Repository['seat']['find'] =>
  async (furnitureId) => {
    const result = await prisma.seat.findUnique({
      where: { furnitureId },
      include: {
        resident: { include: { photos: true } },
        reservations: { include: { by: { include: { photos: true } } } },
      },
    })

    return result
  }
