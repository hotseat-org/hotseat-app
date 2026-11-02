import { getCore } from "~/core/get-core"
import type { Profile } from "~/core/profile/types"
import type { User } from "~/core/user/types"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"

/**
 * Settings modals are driven by `?settings=<scope>/<section>` on whatever page
 * is open (see useSettings). The layout that owns a scope loads the open
 * panel's data here, so a settings URL is rendered in full on the server —
 * page, modal and panel data in one response — and refreshes like any other
 * loader data after a mutation.
 */
export const parseSettings = (request: Request) => {
  const raw = new URL(request.url).searchParams.get("settings") ?? ""
  const [scope, section] = raw.split("/")
  return { scope: scope || undefined, section: section || undefined }
}

/** User settings (`?settings=user/…`), owned by the app layout. */
export async function loadUserSettings(request: Request, user: User) {
  const { scope, section = "profile" } = parseSettings(request)
  if (scope !== "user") return null
  const core = getCore()
  switch (section) {
    case "organizations":
      return { section, organizations: await core.user.getOrganizations(user.email) }
    case "invitations":
      return { section, invitations: await core.user.getOrganizationInvites(user.email) }
    default:
      // Profile and danger zone need nothing beyond the user (root loader).
      return { section }
  }
}

/** Organization settings (`?settings=org/…`), owned by the org layout. */
export async function loadOrgSettings(request: Request, profile: Profile) {
  const { scope, section = "general" } = parseSettings(request)
  // Organization settings are an admin's (members aren't shown them at all).
  if (scope !== "org" || profile.role !== Role.ADMIN) return null
  const core = getCore()
  const args = { userEmail: profile.userEmail, slug: profile.organizationSlug }
  switch (section) {
    case "members":
      return { section, members: await core.organization.getMembers(args) }
    case "invitations":
      return {
        section,
        invites: await core.organization.getInvites(args),
        origin: new URL(request.url).origin,
      }
    case "offices": {
      const offices = await core.organization.listOffices(profile.organizationSlug)
      return {
        section,
        offices: offices.data.map(({ slug, name, thumbnail }) => ({ slug, name, thumbnail })),
      }
    }
    case "teams": {
      const [teams, members, offices] = await Promise.all([
        core.team.list(profile.organizationSlug),
        core.organization.listMembers(profile.organizationSlug),
        core.team.officeZones(profile.organizationSlug),
      ])

      return {
        section,
        teams,
        teamPeople: members.data.map(({ userEmail, displayName, avatarUrl }) => ({
          email: userEmail,
          name: displayName?.trim() || userEmail.split("@")[0],
          avatarUrl: avatarUrl ?? undefined,
        })),
        teamOffices: offices,
      }
    }
    default:
      return { section }
  }
}

export type UserSettingsData = Awaited<ReturnType<typeof loadUserSettings>>
export type OrgSettingsData = Awaited<ReturnType<typeof loadOrgSettings>>
