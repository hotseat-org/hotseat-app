import { createMysqlRepository } from '~/repository'
import type { Core } from '.'
import { createCore } from '.'
import prisma from '~/services/prisma.server'

let core: Core

export const getCore = () => {
  if (core) return core

  const repository = createMysqlRepository(prisma)
  core = createCore({ repository })

  return core
}
