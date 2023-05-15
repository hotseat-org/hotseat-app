import type { PrismaClient } from '@prisma/client'
import type { MainRepository } from '../types'

export interface FindReservationArgs {
  seatId?: string
  userId?: string
  filter?: {
    from: Date
    to: Date
  }
}

export const findReservation =
  (prisma: PrismaClient): MainRepository['reservation']['find'] =>
  async ({ seatId, userId, filter }: FindReservationArgs) => {
    const result = await prisma.reservation.findFirst({
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
