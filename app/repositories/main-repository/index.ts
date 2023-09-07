import { createOrganization } from './methods/organization/create'
import { findOrganization } from './methods/organization/find'
import { findManyOrganizations } from './methods/organization/findMany'
import { createUser } from './methods/user/create'
import { findUser } from './methods/user/find'
import type { MainRepository } from './types'

export const createMainMysqlRepository = (): MainRepository => {
  return {
    user: {
      create: createUser,
      find: findUser,
    },
    organization: {
      find: findOrganization,
      findMany: findManyOrganizations,
      create: createOrganization,
    },
  }
}
