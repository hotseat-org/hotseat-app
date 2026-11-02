import type { CoreContext } from "../types"
import type { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"

/** The most people one import takes. */
export const MAX_IMPORT = 5000

export interface ImportMembersArgs {
  organizationSlug: string
  people: { email: string; displayName?: string; role: Role }[]
}

/**
 * Add people to an organization at once (an admin's import): each a member
 * straight away, with an account their first sign-in takes over, so they can
 * be given desks and seen in Who's in before they ever sign in. People already
 * members stay as they are. How many were added, and how many were there.
 */
export const importOrganizationMembers =
  ({ mainRepository }: CoreContext) =>
  async ({ organizationSlug, people }: ImportMembersArgs) => {
    // One row per address, lower case; a name, else the address's own.
    const byEmail = new Map(
      people.map((person) => {
        const email = person.email.trim().toLowerCase()
        const displayName = person.displayName?.trim() || email.split("@")[0]

        return [email, { email, displayName, role: person.role }]
      })
    )
    const unique = [...byEmail.values()].slice(0, MAX_IMPORT)

    const added = await mainRepository.profile.importMany({ organizationSlug, people: unique })

    return { added: added.length, alreadyMembers: unique.length - added.length }
  }
