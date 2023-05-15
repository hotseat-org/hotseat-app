import type { PrismaClient } from '@prisma/client'
import type { MainRepository } from '../types'

export const deleteSeat =
  (prisma: PrismaClient): MainRepository['seat']['delete'] =>
  async (id) => {
    await prisma.seat.delete({ where: { id } })
  }
