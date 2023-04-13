import type { PrismaClient } from '@prisma/client'
import type { Repository } from '../types'

export interface CreateReservationArgs {
  userId: string
  seatId: string
  from: Date
  to: Date
}

export const createReservation =
  (prisma: PrismaClient): Repository['reservation']['create'] =>
  async ({ userId, seatId, from, to }: CreateReservationArgs) => {
    const reservation = prisma.reservation.create({
      data: {
        from,
        to,
        seat: { connect: { id: seatId } },
        by: { connect: { id: userId } },
      },
      include: {
        seat: true,
        by: true,
      },
    })

    return reservation
  }
