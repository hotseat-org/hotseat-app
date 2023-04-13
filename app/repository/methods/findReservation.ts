import type { PrismaClient } from '@prisma/client'
import type { Repository } from '../types'

export interface FindReservationArgs {
  seatId?: string
  userId?: string
  filter?: {
    from: Date
    to: Date
  }
}

export const findReservation =
  (prisma: PrismaClient): Repository['reservation']['find'] =>
  async ({ seatId, userId, filter }: FindReservationArgs) => {
    const result = await prisma.reservation.findFirst({
      where: {
        OR: [{ seat: { id: seatId } }, { by: { id: userId } }],
        from: filter ? { gte: filter.from } : undefined,
        to: filter ? { lte: filter.to } : undefined,
      },
      include: {
        by: true,
        seat: true,
      },
    })

    return result
  }
