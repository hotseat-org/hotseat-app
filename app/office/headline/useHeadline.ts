import { useMemo } from "react"
import { useOfficeStore } from "../store"
import { useMyTeams } from "../teams"
import { useDesksOnDay, useGivenUpDesk, useWaitlist, type DeskOnDay } from "../booking/useBooking"
import { composeHeadline, type Headline, type MyDay } from "./composeHeadline"
import { useI18n } from "~/i18n/I18nProvider"
import { isOpenDay } from "~/utils/booking"

/** Someone in the organization, as the headline names them. */
export interface HeadlinePerson {
  userEmail: string
  displayName?: string
}

/** "Lena" from "Lena Kovář"; the email's name part when there's no name. */
const getShortName = ({ userEmail, displayName }: HeadlinePerson) =>
  displayName?.trim().split(/\s+/)[0] || userEmail.split("@")[0]

/** Where you are on the day: at a desk, away from yours, waiting, or nowhere yet. */
const getMyDay = (mine: DeskOnDay | undefined, isAway: boolean, isWaiting: boolean): MyDay => {
  if (mine)
    return {
      kind: mine.state.kind === "resident" ? "resident" : "booked",
      deskLabel: mine.desk.label,
    }

  if (isAway) return { kind: "away" }

  if (isWaiting) return { kind: "waiting" }

  return { kind: "none" }
}

/**
 * The shown day as a headline (see composeHeadline), from the office's state:
 * your desk, the waitlist, free desks and who else is in — your teams' people
 * first. None until booking knows its day.
 */
export const useHeadline = (me: HeadlinePerson, members: HeadlinePerson[]): Headline | null => {
  const i18n = useI18n()
  const day = useOfficeStore((state) => state.booking.day)
  const today = useOfficeStore((state) => state.booking.today)
  const opening = useOfficeStore((state) => state.booking.opening)
  const { desks, byPerson } = useDesksOnDay()
  const givenUp = useGivenUpDesk(me.userEmail)
  const { isWaiting } = useWaitlist()
  const myTeams = useMyTeams()

  return useMemo(() => {
    if (!day) return null

    const isTeammate = (email: string) => myTeams.some((team) => team.members.includes(email))
    const peopleIn = members
      .filter((member) => member.userEmail !== me.userEmail && byPerson.has(member.userEmail))
      .sort(
        (first, second) =>
          Number(isTeammate(second.userEmail)) - Number(isTeammate(first.userEmail))
      )
      .map(getShortName)

    return composeHeadline(i18n, {
      day,
      today,
      isOpen: isOpenDay(day, opening),
      myDay: getMyDay(byPerson.get(me.userEmail), !!givenUp, isWaiting),
      freeCount: desks.filter((entry) => entry.state.kind === "free").length,
      peopleIn,
    })
  }, [i18n, day, today, opening, desks, byPerson, givenUp, isWaiting, myTeams, me, members])
}
