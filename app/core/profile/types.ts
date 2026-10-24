import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"

export interface Profile {
  userEmail: string
  organizationSlug: string
  role: Role
  displayName?: string
  avatarUrl?: string
  pet?: string
  /** Their favourite office in this organization: where they land. */
  favoriteOfficeSlug?: string | null
  createdAt: Date
}
