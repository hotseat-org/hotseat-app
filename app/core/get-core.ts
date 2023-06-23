import { createMainMysqlRepository } from '~/repositories/main-repository'
import type { Core } from '.'
import { createCore } from '.'
import prisma from '~/services/prisma.server'
import { createUserMockGoogleRepository } from '~/repositories/user/mock-google'

let core: Core

export const getCore = () => {
  if (core) return core

  const mainRepository = createMainMysqlRepository(prisma)
  const userRepository = createUserMockGoogleRepository()

  core = createCore({ mainRepository, userRepository })

  return core
}
