import type { PrismaClient } from '@prisma/client'
import type { MainRepository } from '../types'

export interface FindReservationsArgs {
  seatId?: string
  userId?: string
  filter?: {
    from: Date
    to: Date
  }
}

export const findReservations =
  (prisma: PrismaClient): MainRepository['reservation']['findMany'] =>
  async ({ seatId, userId, filter }: FindReservationsArgs) => {
    const result = await prisma.reservation.findMany({
      where: {
        OR: [{ seat: { id: seatId } }, { userId }],
        from: filter ? { gte: filter.from } : undefined,
        to: filter ? { lte: filter.to } : undefined,
      },
      include: {
        seat: { include: { space: { select: { id: true } } } },
      },
    })

    return result
  }
