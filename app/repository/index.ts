import type { PrismaClient } from '@prisma/client'
import type { Repository } from './types'
import { createSpace } from './methods/createSpace'
import { getSpaces } from './methods/getSpaces'
import { getSpace } from './methods/getSpace'
import { getSeat } from './methods/getSeat'
import { createSeat } from './methods/createSeat'
import { getSeats } from './methods/getSeats'

export const createMysqlRepository = (prisma: PrismaClient): Repository => {
  return {
    createSpace: createSpace(prisma),
    getSpaces: getSpaces(prisma),
    getSpace: getSpace(prisma),
    getSeat: getSeat(prisma),
    createSeat: createSeat(prisma),
    getSeats: getSeats(prisma),
  }
}
