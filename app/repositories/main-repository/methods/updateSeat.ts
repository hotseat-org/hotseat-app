import type { PrismaClient } from '@prisma/client'
import type { MainRepository } from '../types'

export const updateSeat =
  (prisma: PrismaClient): MainRepository['seat']['update'] =>
  async (id, residentId) => {
    const result = await prisma.seat.update({
      where: { id },
      data: { residentId },
      include: {
        space: { select: { id: true } },
        reservations: {
          include: { seat: { include: { space: { select: { id: true } } } } },
        },
      },
    })

    return result
  }
