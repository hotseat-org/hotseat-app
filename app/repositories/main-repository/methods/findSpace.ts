import type { PrismaClient } from '@prisma/client'
import type { MainRepository } from '../types'

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
  (prisma: PrismaClient): MainRepository['space']['find'] =>
  async ({ id, filter }: FindSpaceArgs) => {
    const result = await prisma.space.findUnique({
      where: { id },
      include: {
        seats: {
          include: {
            space: { select: { id: true } },
            reservations: {
              where: {
                from: { gte: filter?.reservations?.from },
                to: { lte: filter?.reservations?.to },
              },
              include: {
                seat: { include: { space: { select: { id: true } } } },
              },
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
