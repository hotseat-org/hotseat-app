import clsx from "clsx"
import { UsersRound, X } from "lucide-react"
import { useState } from "react"
import { nameOf, type ShellMember } from "./shell-ui"
import { getTeamTint } from "~/components/teams/teamLook"
import { useI18n } from "~/i18n/I18nProvider"
import { useDesksOnDay } from "~/office/booking/useBooking"
import { useOfficeStore } from "~/office/store"
import { useTeamDays } from "~/office/teams"
import { isOpenDay, type Day } from "~/utils/booking"

/** People named before "and n more". */
const MAX_NAMES = 3

const getDismissKey = (day: Day) => `hotseat:team-day-seen:${day}`

/** Whether the card was closed for that day in this browser (unreadable: no). */
const isDismissed = (day: Day) => {
  try {
    return localStorage.getItem(getDismissKey(day)) === "1"
  } catch {
    return false
  }
}

/**
 * "Tuesday is a Design day": on a day your team comes in together, while
 * you've no desk yet, who of it is in — and a way to sit with them (Find a
 * seat, which starts with your team). Closed, it stays closed for that day.
 */
export const TeamDayCard = ({
  me,
  members,
  onFindSeat,
  className,
}: {
  me: ShellMember
  members: ShellMember[]
  onFindSeat: () => void
  /** Where it floats. */
  className: string
}) => {
  const { t, tn, format } = useI18n()
  const day = useOfficeStore((state) => state.booking.day)
  const today = useOfficeStore((state) => state.booking.today)
  const opening = useOfficeStore((state) => state.booking.opening)
  const getTeamsIn = useTeamDays()
  const { byPerson } = useDesksOnDay()
  const [dismissed, setDismissed] = useState<Day[]>([])

  const team = getTeamsIn(day)[0]
  const isShown =
    !!team &&
    day >= today &&
    isOpenDay(day, opening) &&
    !byPerson.has(me.userEmail) &&
    !dismissed.includes(day) &&
    !isDismissed(day)
  if (!isShown) return null

  const dismiss = () => {
    try {
      localStorage.setItem(getDismissKey(day), "1")
    } catch {
      // Not kept: it's closed for now all the same.
    }
    setDismissed((current) => [...current, day])
  }

  const names = team.members
    .filter((email) => email !== me.userEmail && byPerson.has(email))
    .map((email) => {
      const member = members.find((candidate) => candidate.userEmail === email)

      return member ? nameOf(member).split(" ")[0] : email.split("@")[0]
    })
  const getWhoIsIn = () => {
    if (names.length === 0) return t("Nobody from it has booked yet.")
    if (names.length <= MAX_NAMES) return t("{names} will be in.", { names: names.join(", ") })

    return tn(
      names.length - MAX_NAMES,
      "{names} and {n} more will be in.",
      "{names} and {n} more will be in.",
      {
        names: names.slice(0, MAX_NAMES).join(", "),
      }
    )
  }

  return (
    <section
      aria-label={t("Team day")}
      className={clsx(
        "pointer-events-auto flex items-start gap-3 rounded-2xl bg-background p-3 pr-2 text-foreground",
        className
      )}
    >
      <span
        className="grid size-10 shrink-0 place-items-center rounded-xl"
        style={getTeamTint(team.color)}
      >
        <UsersRound className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black">
          {t("{weekday} is a {team} day", { weekday: format.weekday(day), team: team.name })}
        </p>
        <p className="mt-0.5 text-xs text-muted">{getWhoIsIn()}</p>
        <button
          type="button"
          onClick={onFindSeat}
          className="mt-2 min-h-9 rounded-full px-4 text-sm font-extrabold"
          style={getTeamTint(team.color)}
        >
          {t("Sit with them")}
        </button>
      </div>
      <button
        type="button"
        aria-label={t("Close")}
        onClick={dismiss}
        className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-secondary hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </section>
  )
}
