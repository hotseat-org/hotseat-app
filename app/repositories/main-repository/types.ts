import { CreateOfficeArgs } from "./methods/office/create"
import { DeleteOfficeArgs } from "./methods/office/delete"
import { FindOfficeArgs } from "./methods/office/find"
import { FindOfficesArgs } from "./methods/office/findMany"
import type { SaveOfficeLayoutArgs } from "./methods/office/saveLayout"
import { UpdateOfficeArgs } from "./methods/office/update"
import type { CreateOrganizationInviteArgs } from "./methods/organization-invite/create"
import type { DeleteOrganizationInviteArgs } from "./methods/organization-invite/delete"
import type { FindOrganizationInviteArgs } from "./methods/organization-invite/find"
import type { FindOrganizationInvitesArgs } from "./methods/organization-invite/findMany"
import type { CreateOrganizationArgs } from "./methods/organization/create"
import type { DeleteOrganizationArgs } from "./methods/organization/delete"
import type { FindOrganizationArgs } from "./methods/organization/find"
import type { FindOrganizationsArgs } from "./methods/organization/findMany"
import type { UpdateOrganizationArgs } from "./methods/organization/update"
import type { CreateProfileArgs } from "./methods/profile/create"
import { DeleteProfileArgs } from "./methods/profile/delete"
import type { FindProfileArgs } from "./methods/profile/find"
import type { FindProfilesArgs } from "./methods/profile/findMany"
import type { UpdateProfileArgs } from "./methods/profile/update"
import type { BookReservationsArgs, BookReservationsResult } from "./methods/reservation/book"
import type { DeleteReservationsArgs } from "./methods/reservation/deleteMany"
import type { FindReservationsArgs } from "./methods/reservation/findMany"
import type { FindUserArgs } from "./methods/user/find"
import { UpdateUserArgs } from "./methods/user/update"
import type { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/client"

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
  createdAt: Date
}

export interface OrganizationInvite {
  email: string
  expiresAt: Date
  organizationSlug: string
  organization: Organization

  createdAt: Date
  updatedAt: Date
}

export interface Office {
  slug: string
  organizationSlug: string
  name: string
  spaceId?: string

  thumbnail?: string
  description?: string
  layout?: unknown
  /** IANA timezone that decides "today" for bookings. */
  timezone: string
  bookingWindowDays: number

  createdAt: Date
  updatedAt: Date
}

export interface Reservation {
  id: string
  organizationSlug: string
  officeSlug: string
  userEmail: string
  deskId: string
  /** Office-local day, `YYYY-MM-DD`. */
  date: string
  seriesId: string | null
  createdByEmail: string
  createdAt: Date
}

export type CreateUserArgs = Pick<User, "email" | "avatarUrl" | "displayName">

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
    find: (args: FindOrganizationInviteArgs) => Promise<OrganizationInvite | null>
    findMany: (args: FindOrganizationInvitesArgs) => Promise<OrganizationInvite[]>
    delete: (args: DeleteOrganizationInviteArgs) => Promise<OrganizationInvite>
  }
  profile: {
    find: (args: FindProfileArgs) => Promise<Profile | null>
    findMany: (args: FindProfilesArgs) => Promise<PaginatedResult<Profile>>
    create: (args: CreateProfileArgs) => Promise<Profile>
    update: (args: UpdateProfileArgs) => Promise<Profile>
    delete: (args: DeleteProfileArgs) => Promise<Profile>
  }
  office: {
    find: (args: FindOfficeArgs) => Promise<Office | null>
    findMany: (args: FindOfficesArgs) => Promise<PaginatedResult<Office>>
    create: (args: CreateOfficeArgs) => Promise<Office>
    update: (args: UpdateOfficeArgs) => Promise<Office>
    delete: (args: DeleteOfficeArgs) => Promise<Office>
    saveLayout: (args: SaveOfficeLayoutArgs) => Promise<{ office: Office; cancelled: number }>
  }
  reservation: {
    findMany: (args: FindReservationsArgs) => Promise<Reservation[]>
    book: (args: BookReservationsArgs) => Promise<BookReservationsResult>
    delete: (args: DeleteReservationsArgs) => Promise<number>
  }
}
