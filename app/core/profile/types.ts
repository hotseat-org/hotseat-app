import { Office } from "../office/types"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"

export interface Profile {
  userEmail: string
  organizationSlug: string
  role: Role
  displayName?: string
  avatarUrl?: string
  favoriteOffice?: Office
  createdAt: Date
}
