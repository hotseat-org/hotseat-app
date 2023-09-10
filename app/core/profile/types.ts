import type { Role } from '@prisma/client'

export interface Profile {
  id: string
  organizationSlug: string
  role: Role
  displayName?: string
}
