import { useCallback, useMemo } from "react"
import { useOfficeStore } from "./store"
import { isoWeekday, type Day } from "~/utils/booking"
import { getKeepingTeam, getTeamHex, getTeamsOf, type OfficeTeam } from "~/utils/teams"

/** The organization's teams, each with its zone in this office. */
export const useTeams = () => useOfficeStore((state) => state.booking.teams)

/** The teams you're in. */
export const useMyTeams = () => {
  const teams = useTeams()
  const me = useOfficeStore((state) => state.booking.me)

  return useMemo(() => (me ? getTeamsOf(teams, me) : []), [teams, me])
}

/** Which of your teams come in together on a day (their team days). */
export const useTeamDays = () => {
  const myTeams = useMyTeams()

  return useCallback(
    (day: Day) => myTeams.filter((team) => team.weekdays.includes(isoWeekday(day))),
    [myTeams]
  )
}

/** The team a desk's zone is kept for on a day, if you're not in it (none: you can book it). */
export const useKeptFor = () => {
  const teams = useTeams()
  const today = useOfficeStore((state) => state.booking.today)
  const me = useOfficeStore((state) => state.booking.me)

  return useCallback(
    (zone: string | undefined, day: Day) =>
      me ? getKeepingTeam(teams, { zone, day, today, email: me }) : null,
    [teams, today, me]
  )
}

/** Your teammates' colours, by their email: each in the first team you share. */
export const useTeammateColors = () => {
  const myTeams = useMyTeams()
  const me = useOfficeStore((state) => state.booking.me)

  return useMemo(() => {
    const colors = new Map<string, string>()
    for (const team of myTeams)
      for (const email of team.members)
        if (email !== me && !colors.has(email)) colors.set(email, getTeamHex(team.color))

    return colors
  }, [myTeams, me])
}

export const teamById = (teams: OfficeTeam[], id: string) =>
  teams.find((team) => team.id === id) ?? null
