import type { Role } from '@prisma/client'

export interface Profile {
  id: string
  userId: string
  email: string
  organizationSlug: string
  role: Role
  displayName?: string
}
