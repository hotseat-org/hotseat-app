import type { PrismaClient } from '@prisma/client'
import type { Repository } from '../types'

export const createSpace =
  (prisma: PrismaClient): Repository['space']['create'] =>
  async ({ name, spaceId }) => {
    const result = await prisma.space.create({
      data: {
        name,
        spaceId,
      },
      include: {
        seats: {
          include: {
            reservations: {
              include: { by: { include: { photos: true } }, seat: true },
            },
          },
        },
      },
    })

    return {
      ...result,
      description: result.description ?? undefined,
    }
  }
