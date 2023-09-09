import type { Role } from '@prisma/client'
import type { CreateOrganizationArgs } from './methods/organization/create'
import type { DeleteOrganizationArgs } from './methods/organization/delete'
import type { FindOrganizationArgs } from './methods/organization/find'
import type { FindOrganizationsArgs } from './methods/organization/findMany'
import type { UpdateOrganizationArgs } from './methods/organization/update'
import type { FindProfileArgs } from './methods/profile/find'
import type { FindUserArgs } from './methods/user/find'

export interface Space {
  id: string
  name: string
  spaceId: string
  description?: string
  seats: Seat[]

  createdAt: Date
  updatedAt: Date
}

export interface Seat {
  id: string
  furnitureId: string
  residentId?: string | null
  space: Pick<Space, 'id'>
  reservations?: Reservation[]

  createdAt: Date
  updatedAt: Date
}

export interface Reservation {
  id: string
  userId: string
  seat: Seat

  createdAt: Date
  updatedAt: Date
}

export interface User {
  id: string
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
}

export interface Profile {
  id: string
  role: Role
}

export type CreateSpaceOptions = Pick<Space, 'name' | 'spaceId' | 'description'>
export type CreateUserArgs = Pick<User, 'email' | 'avatarUrl' | 'displayName'>

export interface MainRepository {
  user: {
    create: (args: CreateUserArgs) => Promise<User>
    find: (args: FindUserArgs) => Promise<User | null>
  }
  organization: {
    findMany: (args: FindOrganizationsArgs) => Promise<Organization[]>
    find: (args: FindOrganizationArgs) => Promise<Organization | null>
    create: (args: CreateOrganizationArgs) => Promise<Organization>
    update: (args: UpdateOrganizationArgs) => Promise<Organization>
    delete: (args: DeleteOrganizationArgs) => Promise<Organization>
  }
  profile: {
    find: (args: FindProfileArgs) => Promise<Profile | null>
  }
}
