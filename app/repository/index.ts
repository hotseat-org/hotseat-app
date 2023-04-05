import type { PrismaClient } from '@prisma/client'
import type { Repository } from './types'
import { createSpace } from './methods/createSpace'
import { getSpaces } from './methods/getSpaces'

export const createMysqlRepository = (prisma: PrismaClient): Repository => {
  return {
    createSpace: createSpace(prisma),
    getSpaces: getSpaces(prisma),
  }
}
