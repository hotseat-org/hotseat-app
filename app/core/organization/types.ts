import type { PaginatedResult } from '~/repositories/main-repository/types'
import type { Profile } from '../profile/types'

export interface Organization {
  name: string
  slug: string
  description?: string
  thumbnailUrl?: string
  invitationHash?: string
}

export interface OrganizationWithMembers extends Organization {
  members: PaginatedResult<Profile>
}
