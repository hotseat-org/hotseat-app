import type { PrismaClient } from '@prisma/client'
import type { Repository } from '../types'

export const findSeatByFurniture =
  (prisma: PrismaClient): Repository['seat']['findByFurniture'] =>
  async (furnitureId) => {
    const result = await prisma.seat.findUnique({
      where: { furnitureId },
      include: {
        resident: { include: { photos: true } },
        reservations: {
          include: { by: { include: { photos: true } }, seat: true },
        },
      },
    })

    return result
  }
