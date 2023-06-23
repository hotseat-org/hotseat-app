import type { PrismaClient } from '@prisma/client'
import type { MainRepository } from '../types'

export const findSeatByFurniture =
  (prisma: PrismaClient): MainRepository['seat']['findByFurniture'] =>
  async (furnitureId) => {
    const result = await prisma.seat.findUnique({
      where: { furnitureId },
      include: {
        space: { select: { id: true } },
        reservations: {
          include: { seat: { include: { space: { select: { id: true } } } } },
        },
      },
    })

    return result
  }
