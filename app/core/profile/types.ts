import type { Role } from '@prisma/client'

export interface Profile {
  userEmail: string
  organizationSlug: string
  role: Role
  displayName?: string
  avatarUrl?: string
}
