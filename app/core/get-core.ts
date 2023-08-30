import { createMainMysqlRepository } from '~/repositories/main-repository'
import type { Core } from '.'
import { createCore } from '.'
import prisma from '~/services/prisma.server'

let core: Core

export const getCore = () => {
  if (core) return core

  const mainRepository = createMainMysqlRepository(prisma)

  core = createCore({ mainRepository })

  return core
}
