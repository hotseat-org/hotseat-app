import type { PrismaClient } from '@prisma/client'
import type { Repository } from '../types'

export const updateSeat =
  (prisma: PrismaClient): Repository['seat']['update'] =>
  async (id, residentId) => {
    const residentUpdate =
      residentId === null
        ? { disconnect: true }
        : { connect: { id: residentId } }

    const result = await prisma.seat.update({
      where: { id },
      data: { resident: residentUpdate },
      include: {
        resident: { include: { photos: true } },
        reservations: {
          include: { by: { include: { photos: true } }, seat: true },
        },
      },
    })

    return result
  }
