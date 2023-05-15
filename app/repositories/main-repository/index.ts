import type { PrismaClient } from '@prisma/client'
import type { MainRepository } from './types'
import { createSpace } from './methods/createSpace'
import { createSeat } from './methods/createSeat'
import { findSpace } from './methods/findSpace'
import { findSpaces } from './methods/findSpaces'
import { findSeat } from './methods/findSeat'
import { findSeats } from './methods/findSeats'
import { deleteSeat } from './methods/deletedSeat'
import { updateSeat } from './methods/updateSeat'
import { findSeatByFurniture } from './methods/findSeatByFurniture'
import { createReservation } from './methods/createReservation'
import { findReservation } from './methods/findReservation'
import { findReservations } from './methods/findReservations'
import { deleteReservation } from './methods/deleteReservation'

export const createMainMysqlRepository = (
  prisma: PrismaClient
): MainRepository => {
  return {
    space: {
      create: createSpace(prisma),
      find: findSpace(prisma),
      findMany: findSpaces(prisma),
    },
    seat: {
      create: createSeat(prisma),
      update: updateSeat(prisma),
      find: findSeat(prisma),
      findByFurniture: findSeatByFurniture(prisma),
      findMany: findSeats(prisma),
      delete: deleteSeat(prisma),
    },
    reservation: {
      create: createReservation(prisma),
      delete: deleteReservation(prisma),
      find: findReservation(prisma),
      findMany: findReservations(prisma),
    },
  }
}
