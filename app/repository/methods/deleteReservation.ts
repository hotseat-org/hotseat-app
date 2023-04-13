import type { PrismaClient } from '@prisma/client'
import type { Repository } from '../types'

export const deleteReservation =
  (prisma: PrismaClient): Repository['reservation']['delete'] =>
  async (id) => {
    await prisma.reservation.delete({
      where: { id },
    })
  }
