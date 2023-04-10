import type { PrismaClient } from '@prisma/client'
import type { Repository } from '../types'

export const getSeat =
  (prisma: PrismaClient): Repository['getSeat'] =>
  async (furnitureId: string) => {
    const result = await prisma.seat.findUnique({ where: { furnitureId } })

    return result
  }
