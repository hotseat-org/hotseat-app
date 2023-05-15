import type { PrismaClient } from '@prisma/client'
import type { MainRepository } from '../types'

export interface CreateReservationArgs {
  userId: string
  seatId: string
  from: Date
  to: Date
}

export const createReservation =
  (prisma: PrismaClient): MainRepository['reservation']['create'] =>
  async ({ userId, seatId, from, to }: CreateReservationArgs) => {
    const reservation = prisma.reservation.create({
      data: {
        from,
        to,
        seat: { connect: { id: seatId } },
        userId,
      },
      include: {
        seat: { include: { space: { select: { id: true } } } },
      },
    })

    return reservation
  }
