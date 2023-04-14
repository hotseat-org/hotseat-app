import type { PrismaClient } from '@prisma/client'
import type { Repository } from '../types'

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
  (prisma: PrismaClient): Repository['seat']['find'] =>
  async ({ id, filter }: FindSeatArgs) => {
    const result = await prisma.seat.findUnique({
      where: { id },
      include: {
        resident: { include: { photos: true } },
        reservations: {
          where: {
            from: { gte: filter?.reservations?.from },
            to: { lte: filter?.reservations?.to },
          },
          include: { by: { include: { photos: true } }, seat: true },
        },
      },
    })

    return result
  }
