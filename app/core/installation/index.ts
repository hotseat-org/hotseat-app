import type { CoreContext } from "../types"
import { createOrganization } from "../organization/create"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"

/**
 * A self-hosted installation: one company, set up by whoever installs it on
 * their first sign-in, which people then join by their email's domain (or an
 * invite).
 */

/** The installation's company, or null before it's set up. */
export const getInstallation =
  ({ mainRepository }: CoreContext) =>
  () =>
    mainRepository.organization.findFirst()

/** "Acme.com, @acme.cz " → ["acme.com", "acme.cz"]: lower case, no @, no blanks or repeats. */
export const parseDomains = (text: string) => [
  ...new Set(
    text
      .split(/[\s,;]+/)
      .map((domain) => domain.trim().replace(/^@/, "").toLowerCase())
      .filter((domain) => /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain))
  ),
]

/** Someone's email domain, lower case ("ada@Acme.com" → "acme.com"). */
const domainOf = (email: string) => email.slice(email.lastIndexOf("@") + 1).toLowerCase()

export interface SetUpInstallationArgs {
  /** Who sets it up: its first admin. */
  userEmail: string
  name: string
  allowedDomains: string[]
}

/** Set up the installation's company, its first admin, and who may join (once only). */
export const setUpInstallation =
  (context: CoreContext) =>
  async ({ userEmail, name, allowedDomains }: SetUpInstallationArgs) => {
    const existing = await context.mainRepository.organization.findFirst()
    if (existing) throw new Error("This Hotseat is set up already")

    const organization = await createOrganization(context)({ name, userEmail })

    return context.mainRepository.organization.update({
      slug: organization.slug,
      data: { allowedDomains },
    })
  }

/**
 * Let someone in by their email's domain: a member of the installation's
 * company if it allows their domain (and they aren't in it yet). Whether
 * they're in now.
 */
export const joinInstallationByDomain =
  ({ mainRepository }: CoreContext) =>
  async (userEmail: string) => {
    const organization = await mainRepository.organization.findFirst()
    if (!organization) return false

    const profile = await mainRepository.profile.find({
      userEmail,
      organizationSlug: organization.slug,
    })
    if (profile) return true

    if (!organization.allowedDomains?.includes(domainOf(userEmail))) return false

    await mainRepository.profile.create({
      email: userEmail,
      organizationSlug: organization.slug,
      data: { role: Role.USER },
    })

    return true
  }
