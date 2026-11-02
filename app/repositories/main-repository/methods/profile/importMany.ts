import type { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/client"
import prisma from "~/services/prisma.server"

export interface ImportProfilesArgs {
  organizationSlug: string
  /** Lower-case emails, each once. */
  people: { email: string; displayName: string; role: Role }[]
}

/**
 * Members, many at once (an import), in one transaction: an account for each
 * address without one (an existing account is matched whatever its letters'
 * case, so nobody gets two), a membership for each not a member yet, and their
 * pending invitations gone (they're in). The emails added.
 */
export const importProfiles = async ({ organizationSlug, people }: ImportProfilesArgs) =>
  prisma.$transaction(async (transaction) => {
    const emails = people.map((person) => person.email)
    const accounts = await transaction.user.findMany({
      where: { email: { in: emails, mode: "insensitive" } },
      select: { email: true },
    })
    // Each address as its account has it (e.g. "Ada@Acme.com"), else as given.
    const storedEmail = new Map(accounts.map(({ email }) => [email.toLowerCase(), email]))
    const withAccounts = people.map((person) => ({
      ...person,
      email: storedEmail.get(person.email) ?? person.email,
    }))

    await transaction.user.createMany({
      data: withAccounts
        .filter((person) => !storedEmail.has(person.email))
        .map(({ email, displayName }) => ({ email, displayName })),
      skipDuplicates: true,
    })

    const members = await transaction.profile.findMany({
      where: { organizationSlug, userEmail: { in: withAccounts.map((person) => person.email) } },
      select: { userEmail: true },
    })
    const isMember = new Set(members.map((member) => member.userEmail))
    const added = withAccounts.filter((person) => !isMember.has(person.email))

    await transaction.profile.createMany({
      data: added.map(({ email, role }) => ({ userEmail: email, organizationSlug, role })),
      skipDuplicates: true,
    })
    await transaction.organizationInvite.deleteMany({
      where: { organizationSlug, email: { in: emails, mode: "insensitive" } },
    })

    return added.map((person) => person.email)
  })
