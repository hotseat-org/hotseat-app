import type { PrismaClient } from '@prisma/client'
import type { MainRepository } from '../types'

export const createSeat =
  (prisma: PrismaClient): MainRepository['seat']['create'] =>
  async (furnitureId, spaceId) => {
    const space = await prisma.space.findUnique({ where: { id: spaceId } })

    if (!space) throw new Error('Space not found')

    const result = await prisma.seat.create({
      data: { furnitureId, spacePK: space?.PK },
      include: {
        space: { select: { id: true } },
        reservations: {
          include: { seat: { include: { space: { select: { id: true } } } } },
        },
      },
    })

    return result
  }
