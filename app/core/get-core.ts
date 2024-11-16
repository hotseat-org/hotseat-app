import type { Core } from "."
import { createCore } from "."
import { mappers } from "~/mappers"
import { createMainMysqlRepository } from "~/repositories/main-repository"
import { imageService } from "~/services/images"

let core: Core

export const getCore = () => {
  if (core) return core

  const mainRepository = createMainMysqlRepository()

  core = createCore({ mainRepository, imageService, mappers })

  return core
}
