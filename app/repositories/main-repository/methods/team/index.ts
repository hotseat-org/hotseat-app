import prisma from "~/services/prisma.server"
import { TEAM_COLOR_NAMES, isTeamColor, type Team, type TeamZone } from "~/utils/teams"

const TEAM_INCLUDE = {
  members: { select: { userEmail: true }, orderBy: { createdAt: "asc" } },
  zones: { select: { officeSlug: true, zone: true, keepDays: true } },
} as const

const toTeam = (row: {
  id: string
  name: string
  color: string
  weekdays: number[]
  members: { userEmail: string }[]
  zones: TeamZone[]
}): Team => ({
  id: row.id,
  name: row.name,
  color: isTeamColor(row.color) ? row.color : "slate",
  weekdays: row.weekdays,
  members: row.members.map((member) => member.userEmail),
  zones: row.zones,
})

/** An organization's teams, by name. */
export const findTeams = async ({ organizationSlug }: { organizationSlug: string }) => {
  const rows = await prisma.team.findMany({
    where: { organizationSlug },
    include: TEAM_INCLUDE,
    orderBy: { name: "asc" },
  })

  return rows.map(toTeam)
}

export interface SaveTeamArgs extends Omit<Team, "id"> {
  organizationSlug: string
  /** None: a new team. */
  id?: string
}

/** Create a team, or replace one's name, colour, days, people and zones. Its id. */
export const saveTeam = async ({ organizationSlug, id, members, zones, ...fields }: SaveTeamArgs) =>
  prisma.$transaction(async (transaction) => {
    const data = { ...fields, color: isTeamColor(fields.color) ? fields.color : "slate" }
    const team = id
      ? await transaction.team.update({ where: { id, organizationSlug }, data })
      : await transaction.team.create({ data: { ...data, organizationSlug } })

    await transaction.teamMember.deleteMany({
      where: { teamId: team.id, userEmail: { notIn: members } },
    })
    await transaction.teamMember.createMany({
      data: members.map((userEmail) => ({ teamId: team.id, organizationSlug, userEmail })),
      skipDuplicates: true,
    })
    await transaction.teamZone.deleteMany({ where: { teamId: team.id } })
    await transaction.teamZone.createMany({
      data: zones.map((zone) => ({ ...zone, teamId: team.id, organizationSlug })),
    })

    return team.id
  })

/** Delete a team (its people stay members of the organization). */
export const deleteTeam = async ({
  organizationSlug,
  id,
}: {
  organizationSlug: string
  id: string
}) => {
  await prisma.team.deleteMany({ where: { id, organizationSlug } })
}

/** Someone's teams, all at once: in these (of the organization's), out of the rest. */
export const setMemberTeams = async ({
  organizationSlug,
  email,
  teamIds,
}: {
  organizationSlug: string
  email: string
  teamIds: string[]
}) =>
  prisma.$transaction(async (transaction) => {
    const teams = await transaction.team.findMany({
      where: { organizationSlug, id: { in: teamIds } },
      select: { id: true },
    })

    await transaction.teamMember.deleteMany({
      where: {
        organizationSlug,
        userEmail: email,
        teamId: { notIn: teams.map((team) => team.id) },
      },
    })
    await transaction.teamMember.createMany({
      data: teams.map((team) => ({ teamId: team.id, organizationSlug, userEmail: email })),
      skipDuplicates: true,
    })
  })

/** Add people to teams by name, making the teams that don't exist yet (an import). */
export const addToTeams = async ({
  organizationSlug,
  memberships,
}: {
  organizationSlug: string
  memberships: { email: string; team: string }[]
}) =>
  prisma.$transaction(async (transaction) => {
    const names = [...new Set(memberships.map((membership) => membership.team))]
    const existing = await transaction.team.findMany({
      where: { organizationSlug, name: { in: names, mode: "insensitive" } },
      select: { id: true, name: true },
    })
    const idByName = new Map(existing.map((team) => [team.name.toLowerCase(), team.id]))
    const created: string[] = []

    for (const name of names) {
      if (idByName.has(name.toLowerCase())) continue

      const team = await transaction.team.create({
        data: { organizationSlug, name, color: pickColor(created.length + existing.length) },
      })
      idByName.set(name.toLowerCase(), team.id)
      created.push(name)
    }

    await transaction.teamMember.createMany({
      data: memberships.map(({ email, team }) => ({
        teamId: idByName.get(team.toLowerCase())!,
        organizationSlug,
        userEmail: email,
      })),
      skipDuplicates: true,
    })

    return { created }
  })

/** Colours for new teams in turn, so neighbours in a list differ. */
const pickColor = (index: number) => TEAM_COLOR_NAMES[index % TEAM_COLOR_NAMES.length]
