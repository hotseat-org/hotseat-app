import type { PrismaClient } from '@prisma/client'
import type { Repository } from '../types'

export interface FindSpaceArgs {
  id: string
  filter?: {
    reservations?: {
      from: Date
      to: Date
    }
  }
}

export const findSpace =
  (prisma: PrismaClient): Repository['space']['find'] =>
  async ({ id, filter }: FindSpaceArgs) => {
    const result = await prisma.space.findUnique({
      where: { id },
      include: {
        seats: {
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
        },
      },
    })

    if (!result) throw new Error('Not found')

    return {
      ...result,
      description: result.description ?? undefined,
    }
  }
