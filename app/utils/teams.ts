/**
 * Teams: people who like to sit together, in any office of the organization.
 * Someone can be in several. Each office can give a team one of its zones,
 * and a team can have days it comes in together.
 */

/** The colours a team can have (soft, and readable as text on their own tint). */
export const TEAM_COLORS = {
  teal: "#3f8f8a",
  denim: "#4a6fae",
  coral: "#d9734f",
  plum: "#8a5ea8",
  amber: "#b7822a",
  sage: "#5f8a5a",
  rose: "#c25a7c",
  slate: "#5c6478",
} as const

export type TeamColor = keyof typeof TEAM_COLORS

export const TEAM_COLOR_NAMES = Object.keys(TEAM_COLORS) as TeamColor[]

export const isTeamColor = (value: unknown): value is TeamColor =>
  typeof value === "string" && value in TEAM_COLORS

/** A team colour's hex (an unknown one: slate). */
export const getTeamHex = (color: string) =>
  isTeamColor(color) ? TEAM_COLORS[color] : TEAM_COLORS.slate

/** The most teams an organization keeps, and the longest name. */
export const MAX_TEAMS = 200
export const MAX_TEAM_NAME = 60

/** How many days before a kept zone opens to everyone. */
export const KEEP_DAYS_CHOICES = [1, 2, 3, 5, 7]

/** A team's zone in one office. */
export interface TeamZone {
  officeSlug: string
  zone: string
  /** Its desks are the team's until this many days before; null: open to all. */
  keepDays: number | null
}

export interface Team {
  id: string
  name: string
  color: TeamColor
  /** The days it comes in together: ISO weekdays (1 = Monday). */
  weekdays: number[]
  /** Its people, by email. */
  members: string[]
  zones: TeamZone[]
}

/** A team as one office sees it: its zone there, if any. */
export interface OfficeTeam extends Omit<Team, "zones"> {
  zone: string | null
  keepDays: number | null
}

export const toOfficeTeam = (team: Team, officeSlug: string): OfficeTeam => {
  const { zones, ...rest } = team
  const here = zones.find((zone) => zone.officeSlug === officeSlug)

  return { ...rest, zone: here?.zone ?? null, keepDays: here?.keepDays ?? null }
}

/** The teams someone is in. */
export const getTeamsOf = <Item extends { members: string[] }>(teams: Item[], email: string) =>
  teams.filter((team) => team.members.includes(email))
