import { createOrganizationInvite } from './methods/organization-invite/create'
import { deleteOrganizationInvite } from './methods/organization-invite/delete'
import { findOrganizationInvite } from './methods/organization-invite/find'
import { findManyOrganizationInvites } from './methods/organization-invite/findMany'
import { createOrganization } from './methods/organization/create'
import { deleteOrganization } from './methods/organization/delete'
import { findOrganization } from './methods/organization/find'
import { findManyOrganizations } from './methods/organization/findMany'
import { updateOrganization } from './methods/organization/update'
import { createProfile } from './methods/profile/create'
import { findProfile } from './methods/profile/find'
import { findProfiles } from './methods/profile/findMany'
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
      delete: deleteOrganization,
      update: updateOrganization,
    },
    organizationInvite: {
      create: createOrganizationInvite,
      find: findOrganizationInvite,
      findMany: findManyOrganizationInvites,
      delete: deleteOrganizationInvite,
    },
    profile: {
      find: findProfile,
      findMany: findProfiles,
      create: createProfile,
    },
  }
}
