import type { Organization } from "../../types"

/** A Prisma organization row → the repository shape (nullable → optional). */
export const toOrganization = (row: {
  name: string
  slug: string
  description: string | null
  thumbnail: string | null
  invitationHash: string | null
}): Organization => ({
  name: row.name,
  slug: row.slug,
  description: row.description ?? undefined,
  thumbnail: row.thumbnail ?? undefined,
  invitationHash: row.invitationHash ?? undefined,
})
