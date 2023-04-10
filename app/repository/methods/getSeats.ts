import type { PrismaClient } from '@prisma/client'
import type { Repository } from '../types'

export const getSeats =
  (prisma: PrismaClient): Repository['getSeats'] =>
  async (spaceId) => {
    const space = await prisma.space.findUnique({ where: { id: spaceId } })

    if (!space) throw new Error('Space not found')

    const result = await prisma.seat.findMany({ where: { spacePK: space.PK } })

    return result
  }
