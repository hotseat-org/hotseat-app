import type { PrismaClient } from '@prisma/client'
import type { MainRepository } from '../types'

export const deleteReservation =
  (prisma: PrismaClient): MainRepository['reservation']['delete'] =>
  async (id) => {
    await prisma.reservation.delete({
      where: { id },
    })
  }
