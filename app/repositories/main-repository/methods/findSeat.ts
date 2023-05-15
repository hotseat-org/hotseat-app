import type { PrismaClient } from '@prisma/client'
import type { MainRepository } from '../types'

export interface FindSeatArgs {
  id: string
  filter?: {
    reservations?: {
      from: Date
      to: Date
    }
  }
}

export const findSeat =
  (prisma: PrismaClient): MainRepository['seat']['find'] =>
  async ({ id, filter }: FindSeatArgs) => {
    const result = await prisma.seat.findUnique({
      where: { id },
      include: {
        space: { select: { id: true } },
        reservations: {
          where: {
            from: { gte: filter?.reservations?.from },
            to: { lte: filter?.reservations?.to },
          },
          include: { seat: { include: { space: { select: { id: true } } } } },
        },
      },
    })

    return result
  }
