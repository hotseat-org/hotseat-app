import type { CoreContext } from "../types"
import type { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"

/**
 * Put imported people in their teams (made if new): each by their membership's
 * own address (an account may have it as "Ada@Acme.com"). The teams made.
 */
const addToTeams = async (
  mainRepository: CoreContext["mainRepository"],
  organizationSlug: string,
  people: { email: string; teams: string[] }[]
) => {
  if (!people.some((person) => person.teams.length > 0)) return []

  const members = await mainRepository.profile.findMany({ filter: { organizationSlug } })
  const storedEmail = new Map(
    members.data.map(({ userEmail }) => [userEmail.toLowerCase(), userEmail])
  )
  const memberships = people.flatMap(({ email, teams }) => {
    const stored = storedEmail.get(email)

    return stored ? teams.map((team) => ({ email: stored, team })) : []
  })
  const { created } = await mainRepository.team.addMembers({ organizationSlug, memberships })

  return created
}

/** The most people one import takes. */
export const MAX_IMPORT = 5000

export interface ImportMembersArgs {
  organizationSlug: string
  people: { email: string; displayName?: string; role: Role; teams?: string[] }[]
}

/**
 * Add people to an organization at once (an admin's import): each a member
 * straight away, with an account their first sign-in takes over, so they can
 * be given desks and seen in Who's in before they ever sign in. People already
 * members stay as they are — but, like the new ones, join the teams the list
 * gives them (teams not there yet are made). How many were added, how many
 * were there, and the teams made.
 */
export const importOrganizationMembers =
  ({ mainRepository }: CoreContext) =>
  async ({ organizationSlug, people }: ImportMembersArgs) => {
    // One row per address, lower case; a name, else the address's own.
    const byEmail = new Map(
      people.map((person) => {
        const email = person.email.trim().toLowerCase()
        const displayName = person.displayName?.trim() || email.split("@")[0]

        return [email, { email, displayName, role: person.role, teams: person.teams ?? [] }]
      })
    )
    const unique = [...byEmail.values()].slice(0, MAX_IMPORT)

    const added = await mainRepository.profile.importMany({
      organizationSlug,
      people: unique.map(({ teams: _teams, ...person }) => person),
    })
    const teamsMade = await addToTeams(mainRepository, organizationSlug, unique)

    return { added: added.length, alreadyMembers: unique.length - added.length, teamsMade }
  }
