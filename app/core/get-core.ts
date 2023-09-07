import { createMainMysqlRepository } from '~/repositories/main-repository'
import type { Core } from '.'
import { createCore } from '.'

let core: Core

export const getCore = () => {
  if (core) return core

  const mainRepository = createMainMysqlRepository()

  core = createCore({ mainRepository })

  return core
}
