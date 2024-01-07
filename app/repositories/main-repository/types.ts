import type { Role } from '@prisma/client'
import type { CreateOrganizationInviteArgs } from './methods/organization-invite/create'
import type { DeleteOrganizationInviteArgs } from './methods/organization-invite/delete'
import type { FindOrganizationInviteArgs } from './methods/organization-invite/find'
import type { FindOrganizationInvitesArgs } from './methods/organization-invite/findMany'
import type { CreateOrganizationArgs } from './methods/organization/create'
import type { DeleteOrganizationArgs } from './methods/organization/delete'
import type { FindOrganizationArgs } from './methods/organization/find'
import type { FindOrganizationsArgs } from './methods/organization/findMany'
import type { UpdateOrganizationArgs } from './methods/organization/update'
import type { CreateProfileArgs } from './methods/profile/create'
import type { FindProfileArgs } from './methods/profile/find'
import type { FindProfilesArgs } from './methods/profile/findMany'
import type { UpdateProfileArgs } from './methods/profile/update'
import type { FindUserArgs } from './methods/user/find'
import { UpdateUserArgs } from './methods/user/update'

export type PaginatedResult<Data> = {
  data: Data[]
  take: number
  skip: number
  totalCount: number
}

export interface User {
  email: string
  avatarUrl?: string | null
  displayName: string

  createdAt: Date
  updatedAt: Date
}

export interface Organization {
  name: string
  slug: string
  description?: string
  thumbnail?: string
  invitationHash?: string
}

export interface OrganizationWithMembers extends Organization {
  profiles: Profile[]
  totalCount: number
}

export interface Profile {
  userEmail: string
  organizationSlug: string
  role: Role
  displayName: string
  avatarUrl?: string
}

export interface OrganizationInvite {
  email: string
  expiresAt: Date
  organizationSlug: string

  createdAt: Date
  updatedAt: Date
}

export type CreateUserArgs = Pick<User, 'email' | 'avatarUrl' | 'displayName'>

export interface MainRepository {
  user: {
    create: (args: CreateUserArgs) => Promise<User>
    find: (args: FindUserArgs) => Promise<User | null>
    update: (args: UpdateUserArgs) => Promise<User>
  }
  organization: {
    findMany: (args: FindOrganizationsArgs) => Promise<Organization[]>
    find: (args: FindOrganizationArgs) => Promise<Organization | null>
    create: (args: CreateOrganizationArgs) => Promise<Organization>
    update: (args: UpdateOrganizationArgs) => Promise<Organization>
    delete: (args: DeleteOrganizationArgs) => Promise<Organization>
  }
  organizationInvite: {
    create: (args: CreateOrganizationInviteArgs) => Promise<OrganizationInvite>
    find: (
      args: FindOrganizationInviteArgs
    ) => Promise<OrganizationInvite | null>
    findMany: (
      args: FindOrganizationInvitesArgs
    ) => Promise<OrganizationInvite[]>
    delete: (args: DeleteOrganizationInviteArgs) => Promise<OrganizationInvite>
  }
  profile: {
    find: (args: FindProfileArgs) => Promise<Profile | null>
    findMany: (args: FindProfilesArgs) => Promise<PaginatedResult<Profile>>
    create: (args: CreateProfileArgs) => Promise<Profile>
    update: (args: UpdateProfileArgs) => Promise<Profile>
  }
}
