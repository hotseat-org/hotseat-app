import { Hourglass, MapPin, Pin, type LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import type { ShellMember } from "./shell-ui"
import { useOfficeStore } from "~/office/store"
import { dayPhrase, useDesksOnDay, useGivenUpDesk, useWaitlist } from "~/office/booking/useBooking"
import { useI18n } from "~/i18n/I18nProvider"
import type { Translator } from "~/i18n/translate"

/** A small link-like action under your day. */
const Action = ({ onPress, children }: { onPress: () => void; children: ReactNode }) => (
  <button
    type="button"
    onClick={onPress}
    className="font-bold text-accent outline-none hover:underline focus-visible:underline"
  >
    {children}
  </button>
)

/** One thing to do about your day: its words and what pressing it does. */
export interface DayAction {
  label: string
  onPress: () => void
}

/** Your day, to show: its icon, a line, and what to do about it. */
export interface DayStatus {
  icon: LucideIcon
  text: string
  actions: ReactNode
  /** The one thing to do (the headline's ink pill); none when there's nothing to. */
  primary?: DayAction
  /** Your bookings, always beside it (a word). */
  bookings: DayAction
  /** Your desk on the day, as the headline shows it large ("D2"). */
  desk?: { label: string; isPermanent: boolean }
}

/**
 * Your day (desktop, by your avatar — see AccountMenu): where you sit on the
 * shown day — your permanent desk, a booking, away, waiting, or no desk yet —
 * and what to do about it: the way there, the waitlist, finding a seat, all
 * your bookings.
 */
export const useDayStatus = (
  me: ShellMember,
  { onOpenBookings, onFindSeat }: { onOpenBookings: () => void; onFindSeat: () => void }
): DayStatus => {
  const i18n = useI18n()
  const { t, tn } = i18n
  const day = useOfficeStore((state) => state.booking.day)
  const today = useOfficeStore((state) => state.booking.today)
  const showRoute = useOfficeStore((state) => state.showRoute)
  const { byPerson } = useDesksOnDay()
  const mine = byPerson.get(me.userEmail)
  const givenUp = useGivenUpDesk(me.userEmail)
  const waitlist = useWaitlist()
  const when = dayPhrase(i18n, day, today)

  const bookings = { label: t("All my bookings"), onPress: onOpenBookings }
  const allBookings = <Action onPress={onOpenBookings}>{bookings.label}</Action>
  const withActions = (status: Omit<DayStatus, "actions" | "bookings">): DayStatus => ({
    ...status,
    bookings,
    actions: (
      <>
        {status.primary && <Action onPress={status.primary.onPress}>{status.primary.label}</Action>}
        {allBookings}
      </>
    ),
  })

  if (mine) {
    const isPermanent = mine.state.kind === "resident"
    const label = mine.desk.label

    return withActions({
      icon: isPermanent ? Pin : MapPin,
      text: getMineText(i18n, { isPermanent, label, when }),
      primary: { label: t("Show the way"), onPress: () => showRoute(mine.desk.id) },
      desk: label ? { label, isPermanent } : undefined,
    })
  }

  if (givenUp) return withActions({ icon: Pin, text: t("Away {when}", { when }) })

  if (waitlist.isWaiting) {
    const waiting =
      waitlist.count > 1 ? ` ${tn(waitlist.count, "({n} waiting)", "({n} waiting)")}` : ""

    return withActions({
      icon: Hourglass,
      text: t("On the waitlist {when}", { when }) + waiting,
      primary: { label: t("Leave"), onPress: waitlist.leave },
    })
  }

  if (waitlist.canWait)
    return withActions({
      icon: Hourglass,
      text: t("Office full {when}", { when }),
      primary: { label: t("Join the waitlist"), onPress: waitlist.join },
    })

  return withActions({
    icon: MapPin,
    text: t("No desk {when}.", { when }),
    primary: day >= today ? { label: t("Find a seat"), onPress: onFindSeat } : undefined,
  })
}

/** Your desk on the day, in a line: "Permanent desk D1", "Desk D2 today". */
const getMineText = (
  { t }: Translator,
  { isPermanent, label, when }: { isPermanent: boolean; label?: string; when: string }
) => {
  if (isPermanent) return label ? t("Permanent desk {label}", { label }) : t("Permanent desk")

  return label ? t("Desk {label} {when}", { label, when }) : t("You have a desk {when}", { when })
}
