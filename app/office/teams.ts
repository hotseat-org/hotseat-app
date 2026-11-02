import { useMemo } from "react"
import { useOfficeStore } from "./store"
import { getTeamsOf, type OfficeTeam } from "~/utils/teams"

/** The organization's teams, each with its zone in this office. */
export const useTeams = () => useOfficeStore((state) => state.booking.teams)

/** The teams you're in. */
export const useMyTeams = () => {
  const teams = useTeams()
  const me = useOfficeStore((state) => state.booking.me)

  return useMemo(() => (me ? getTeamsOf(teams, me) : []), [teams, me])
}

export const teamById = (teams: OfficeTeam[], id: string) =>
  teams.find((team) => team.id === id) ?? null
