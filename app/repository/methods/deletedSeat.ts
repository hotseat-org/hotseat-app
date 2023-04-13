import type { PrismaClient } from '@prisma/client'
import type { Repository } from '../types'

export const deleteSeat =
  (prisma: PrismaClient): Repository['seat']['delete'] =>
  async (id) => {
    await prisma.seat.delete({ where: { id } })
  }
