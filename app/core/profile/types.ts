import type { Role } from "@prisma/client"
import { Office } from "../office/types"

export interface Profile {
  userEmail: string
  organizationSlug: string
  role: Role
  displayName?: string
  avatarUrl?: string
  favoriteOffice?: Office
}
