import type { PrismaClient } from '@prisma/client'
import type { Repository } from '../types'

export const createSeat =
  (prisma: PrismaClient): Repository['createSeat'] =>
  async (furnitureId: string, spaceId: string) => {
    const space = await prisma.space.findUnique({ where: { id: spaceId } })

    if (!space) throw new Error('Space not found')

    const result = await prisma.seat.create({
      data: { furnitureId, spacePK: space?.PK },
    })

    return result
  }
