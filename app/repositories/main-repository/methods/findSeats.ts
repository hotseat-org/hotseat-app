import type { PrismaClient } from '@prisma/client'
import type { MainRepository } from '../types'

export interface FindSeatsArgs {
  spaceId: string
  residentId?: string
}

export const findSeats =
  (prisma: PrismaClient): MainRepository['seat']['findMany'] =>
  async ({ spaceId, residentId }: FindSeatsArgs) => {
    const space = await prisma.space.findUnique({ where: { id: spaceId } })

    if (!space) throw new Error('Space not found')

    const result = await prisma.seat.findMany({
      where: { spacePK: space.PK, residentId },
      include: {
        space: true,
        reservations: {
          include: { seat: { include: { space: { select: { id: true } } } } },
        },
      },
    })

    return result
  }
