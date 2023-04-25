import type { PrismaClient } from '@prisma/client'
import type { Repository } from '../types'

export interface FindUserArgs {
  id: string
  filter?: {
    reservations?: {
      from: Date
      to: Date
    }
  }
}

export const findUser =
  (prisma: PrismaClient): Repository['user']['find'] =>
  async ({ id, filter }: FindUserArgs) => {
    const result = await prisma.user.findUnique({
      where: { id },
      include: {
        photos: true,
        reservations: {
          include: { seat: true, by: true },
          where: {
            from: { gte: filter?.reservations?.from },
            to: { lte: filter?.reservations?.to },
          },
        },
        seatsResident: true,
      },
    })

    return result
  }
