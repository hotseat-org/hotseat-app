import { Hourglass, MapPin, Pin, type LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import type { ShellMember } from "./shell-ui"
import { useOfficeStore } from "~/office/store"
import { dayPhrase, useDesksOnDay, useGivenUpDesk, useWaitlist } from "~/office/booking/useBooking"
import { useI18n } from "~/i18n/I18nProvider"

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

/** Your day, to show: its icon, a line, and what to do about it. */
export interface DayStatus {
  icon: LucideIcon
  text: string
  actions: ReactNode
}

/**
 * Your day (desktop, by your avatar — see AccountMenu): where you sit on the
 * shown day — your permanent desk, a booking, away, waiting, or no desk yet —
 * and what to do about it: the way there, the waitlist, all your bookings.
 */
export const useDayStatus = (me: ShellMember, onOpenBookings: () => void): DayStatus => {
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

  const allBookings = <Action onPress={onOpenBookings}>{t("All my bookings")}</Action>
  return mine
    ? {
        icon: mine.state.kind === "resident" ? Pin : MapPin,
        text:
          mine.state.kind === "resident"
            ? mine.desk.label
              ? t("Permanent desk {label}", { label: mine.desk.label })
              : t("Permanent desk")
            : mine.desk.label
              ? t("Desk {label} {when}", { label: mine.desk.label, when })
              : t("You have a desk {when}", { when }),
        actions: (
          <>
            <Action onPress={() => showRoute(mine.desk.id)}>{t("Show the way")}</Action>
            {allBookings}
          </>
        ),
      }
    : givenUp
      ? { icon: Pin, text: t("Away {when}", { when }), actions: allBookings }
      : waitlist.isWaiting
        ? {
            icon: Hourglass,
            text:
              t("On the waitlist {when}", { when }) +
              (waitlist.count > 1
                ? ` ${tn(waitlist.count, "({n} waiting)", "({n} waiting)")}`
                : ""),
            actions: (
              <>
                <Action onPress={waitlist.leave}>{t("Leave")}</Action>
                {allBookings}
              </>
            ),
          }
        : waitlist.canWait
          ? {
              icon: Hourglass,
              text: t("Office full {when}", { when }),
              actions: (
                <>
                  <Action onPress={waitlist.join}>{t("Join the waitlist")}</Action>
                  {allBookings}
                </>
              ),
            }
          : {
              icon: MapPin,
              text: t("No desk {when}.", { when }),
              actions: (
                <>
                  {day >= today && <span className="text-muted">{t("Click a free one.")}</span>}
                  {allBookings}
                </>
              ),
            }
}
