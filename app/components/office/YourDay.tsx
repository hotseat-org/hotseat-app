import { Hourglass, MapPin, Pin } from "lucide-react"
import type { ReactNode } from "react"
import { MemberAvatar, type ShellMember } from "./shell-ui"
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

/**
 * Your day in the bottom bar (desktop): where you sit on the shown day — your
 * permanent desk, a booking, away, waiting, or no desk yet — and what to do
 * about it: the way there, the waitlist, all your bookings.
 */
export const YourDay = ({
  me,
  onOpenBookings,
}: {
  me: ShellMember
  onOpenBookings: () => void
}) => {
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
  const { icon, status, actions } = mine
    ? {
        icon: mine.state.kind === "resident" ? Pin : MapPin,
        status:
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
      ? { icon: Pin, status: t("Away {when}", { when }), actions: allBookings }
      : waitlist.isWaiting
        ? {
            icon: Hourglass,
            status:
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
              status: t("Office full {when}", { when }),
              actions: (
                <>
                  <Action onPress={waitlist.join}>{t("Join the waitlist")}</Action>
                  {allBookings}
                </>
              ),
            }
          : {
              icon: MapPin,
              status: t("No desk {when}.", { when }),
              actions: (
                <>
                  {day >= today && <span className="text-muted">{t("Click a free one.")}</span>}
                  {allBookings}
                </>
              ),
            }
  const Icon = icon

  return (
    <div className="flex min-w-0 max-w-72 items-center gap-2.5 pl-1 pr-2">
      <MemberAvatar m={me} className="size-9 shrink-0 rounded-xl" />
      <div className="min-w-0">
        <p className="flex items-center gap-1 truncate text-sm font-extrabold text-foreground">
          <Icon className="size-3.5 shrink-0 text-muted" />
          <span className="truncate">{status}</span>
        </p>
        <p className="flex items-center gap-2.5 whitespace-nowrap text-xs">{actions}</p>
      </div>
    </div>
  )
}
