import type { Profile } from "../profile/types"
import type { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"
import type { PaginatedResult } from "~/repositories/main-repository/types"

export interface Organization {
  name: string
  slug: string
  description?: string
  thumbnailUrl?: string
  invitationHash?: string
  /** Self-hosted: email domains whose people join without an invite. */
  allowedDomains?: string[]
}

/** One of someone's organizations, for the switcher: their role and how many members. */
export interface OrganizationSummary extends Organization {
  role: Role
  memberCount: number
}

export interface OrganizationWithMembers extends Organization {
  members: PaginatedResult<Profile>
  profile: Profile
  /** How many admins it has (the last one can't leave). */
  adminCount: number
}
