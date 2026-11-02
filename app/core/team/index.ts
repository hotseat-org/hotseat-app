import type { CoreContext } from "../types"
import { LocalizedError } from "~/i18n/errors"
import { getZones } from "~/office/zones/zones"
import { parseLayout } from "~/office/schema"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"
import { ALL_WEEKDAYS } from "~/utils/booking"
import {
  KEEP_DAYS_CHOICES,
  MAX_TEAM_NAME,
  MAX_TEAMS,
  isTeamColor,
  toOfficeTeam,
  type Team,
} from "~/utils/teams"

export class TeamError extends LocalizedError {}

const requireAdmin = async (
  { mainRepository }: CoreContext,
  organizationSlug: string,
  userEmail: string
) => {
  const profile = await mainRepository.profile.find({ organizationSlug, userEmail })
  if (profile?.role !== Role.ADMIN) throw new Error("Forbidden")
}

const isUniqueViolation = (error: unknown) =>
  typeof error === "object" && error !== null && "code" in error && error.code === "P2002"

/** An organization's teams — for a caller that has already checked membership. */
export const listTeams =
  ({ mainRepository }: CoreContext) =>
  (organizationSlug: string) =>
    mainRepository.team.findMany({ organizationSlug })

/** The teams as an office sees them: each with its zone there, if any. */
export const listOfficeTeams =
  ({ mainRepository }: CoreContext) =>
  async ({ organizationSlug, officeSlug }: { organizationSlug: string; officeSlug: string }) => {
    const teams = await mainRepository.team.findMany({ organizationSlug })

    return teams.map((team) => toOfficeTeam(team, officeSlug))
  }

/** Each office with the names of its zones (where a team can sit). */
export const listOfficeZones =
  ({ mainRepository }: CoreContext) =>
  async (organizationSlug: string) => {
    const offices = await mainRepository.office.findMany({ filter: { organizationSlug } })

    return offices.data.map((office) => ({
      slug: office.slug,
      name: office.name,
      zones: getZones(parseLayout(office.layout).pieces).map((zone) => zone.name),
    }))
  }

/**
 * Create a team (no `id`) or replace one: its name, colour, team days, people
 * and a zone in each office. People who aren't members and offices that don't
 * exist are left out. The team's id.
 */
export const saveTeam =
  (context: CoreContext) =>
  async ({
    organizationSlug,
    userEmail,
    team,
  }: {
    organizationSlug: string
    /** Who's saving it: an admin. */
    userEmail: string
    team: Omit<Team, "id"> & { id?: string }
  }) => {
    await requireAdmin(context, organizationSlug, userEmail)
    const { mainRepository } = context

    const name = team.name.trim().replace(/\s+/g, " ").slice(0, MAX_TEAM_NAME)
    if (!name) throw new TeamError("Give the team a name.")

    const [teams, members, offices] = await Promise.all([
      mainRepository.team.findMany({ organizationSlug }),
      mainRepository.profile.findMany({ filter: { organizationSlug } }),
      mainRepository.office.findMany({ filter: { organizationSlug } }),
    ])
    if (!team.id && teams.length >= MAX_TEAMS)
      throw new TeamError("An organization can have up to 200 teams.")
    if (team.id && !teams.some((existing) => existing.id === team.id)) throw new Error("Not Found")
    const isTaken = teams.some(
      (existing) => existing.id !== team.id && existing.name.toLowerCase() === name.toLowerCase()
    )
    if (isTaken) throw new TeamError("There's a team with this name already.")

    const memberEmails = new Set(members.data.map((member) => member.userEmail))
    const officeSlugs = new Set(offices.data.map((office) => office.slug))

    try {
      return await mainRepository.team.save({
        organizationSlug,
        id: team.id,
        name,
        color: isTeamColor(team.color) ? team.color : "slate",
        weekdays: ALL_WEEKDAYS.filter((weekday) => team.weekdays.includes(weekday)),
        members: [...new Set(team.members)].filter((email) => memberEmails.has(email)),
        zones: team.zones
          .filter((zone) => officeSlugs.has(zone.officeSlug) && zone.zone.trim())
          .filter(
            (zone, index, all) =>
              all.findIndex((other) => other.officeSlug === zone.officeSlug) === index
          )
          .map((zone) => ({
            officeSlug: zone.officeSlug,
            zone: zone.zone.trim(),
            keepDays:
              zone.keepDays !== null && KEEP_DAYS_CHOICES.includes(zone.keepDays)
                ? zone.keepDays
                : null,
          })),
      })
    } catch (error) {
      // Saved with the same name meanwhile.
      if (isUniqueViolation(error)) throw new TeamError("There's a team with this name already.")
      throw error
    }
  }

/** Which teams a member is in, set by an admin (Members → Teams…). */
export const setMemberTeams =
  (context: CoreContext) =>
  async ({
    organizationSlug,
    userEmail,
    memberEmail,
    teamIds,
  }: {
    organizationSlug: string
    /** Who's doing it: an admin. */
    userEmail: string
    memberEmail: string
    teamIds: string[]
  }) => {
    await requireAdmin(context, organizationSlug, userEmail)
    const member = await context.mainRepository.profile.find({
      organizationSlug,
      userEmail: memberEmail,
    })
    if (!member) throw new Error("Not Found")

    await context.mainRepository.team.setMemberTeams({
      organizationSlug,
      email: memberEmail,
      teamIds: [...new Set(teamIds)],
    })
  }

/** Delete a team: its people stay in the organization. */
export const deleteTeam =
  (context: CoreContext) =>
  async ({
    organizationSlug,
    userEmail,
    id,
  }: {
    organizationSlug: string
    userEmail: string
    id: string
  }) => {
    await requireAdmin(context, organizationSlug, userEmail)
    await context.mainRepository.team.delete({ organizationSlug, id })
  }
