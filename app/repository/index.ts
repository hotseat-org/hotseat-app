import type { PrismaClient } from '@prisma/client'
import type { Repository } from './types'
import { createSpace } from './methods/createSpace'
import { createSeat } from './methods/createSeat'
import { findSpace } from './methods/findSpace'
import { findSpaces } from './methods/findSpaces'
import { findSeat } from './methods/findSeat'
import { findSeats } from './methods/findSeats'
import { deleteSeat } from './methods/deletedSeat'
import { findUser } from './methods/findUser'
import { createUser } from './methods/createUser'
import { findUsers } from './methods/findUsers'
import { updateSeat } from './methods/updateSeat'

export const createMysqlRepository = (prisma: PrismaClient): Repository => {
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
      findMany: findSeats(prisma),
      delete: deleteSeat(prisma),
    },
    user: {
      find: findUser(prisma),
      findMany: findUsers(prisma),
      create: createUser(prisma),
    },
  }
}
