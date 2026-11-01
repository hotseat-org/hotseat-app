import { CloseButton } from "@heroui/react"
import { MapPin, Settings2 } from "lucide-react"
import { useEffect, useMemo } from "react"
import { MemberAvatar, PANEL, nameOf, type ShellMember } from "./shell-ui"
import { WeekDots } from "./WeekDots"
import { useOfficeStore } from "~/office/store"
import { deskName, useDesksOnDay, useWeekPresence } from "~/office/booking/useBooking"
import { useSettings } from "~/components/settings/useSettings"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"
import { useI18n } from "~/i18n/I18nProvider"

/** Who's in on the shown day (people with a desk first); Find opens their desk. */
export const WhosInList = ({
  me,
  members,
  onFind,
}: {
  me: ShellMember
  members: ShellMember[]
  onFind: () => void
}) => {
  const day = useOfficeStore((s) => s.booking.day)
  const today = useOfficeStore((s) => s.booking.today)
  const spotlightSeat = useOfficeStore((s) => s.spotlightSeat)
  const i18n = useI18n()
  const { t } = i18n
  const { open: openSettings } = useSettings()
  const { byPerson } = useDesksOnDay()
  const week = useWeekPresence()
  const roster = useMemo(
    () =>
      members
        .map((m, i) => ({ m, i, at: byPerson.get(m.userEmail) }))
        .sort((a, b) => Number(!a.at) - Number(!b.at) || a.i - b.i),
    [members, byPerson]
  )
  const inCount = roster.filter((r) => r.at).length

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="mb-3">
        <p className="text-xs text-muted">
          {day === today ? t("Today") : i18n.format.long(day)} ·{" "}
          {t("{in} of {total} in the office", { in: inCount, total: members.length })}
        </p>
      </header>
      {members.length <= 1 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm font-bold text-foreground">{t("It's just you so far")}</p>
          {/* Inviting is an admin's. */}
          {me.role === Role.ADMIN && (
            <button
              type="button"
              onClick={() => openSettings("org", "invitations")}
              className="min-h-11 rounded-xl bg-accent/15 px-4 text-sm font-bold text-accent"
            >
              {t("Invite teammates")}
            </button>
          )}
        </div>
      ) : (
        <ul className="-mx-1 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-1">
          {roster.map(({ m, at }) => (
            <li key={m.userEmail} className="flex items-center gap-3 rounded-xl px-1 py-1.5">
              <MemberAvatar m={m} className="size-10 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">
                  {m.userEmail === me.userEmail ? t("You") : nameOf(m)}
                </p>
                <p className="flex items-center gap-2 text-xs text-muted">
                  {/* Fixed width: every row's dots start at the same spot. */}
                  <span className="w-16 shrink-0 truncate">
                    {at ? deskName(i18n, at.desk) : t("Not in")}
                  </span>
                  <WeekDots email={m.userEmail} presence={week} />
                </p>
              </div>
              {at && (
                <button
                  type="button"
                  aria-label={t("Show {name}'s desk on the plan", { name: nameOf(m) })}
                  onClick={() => {
                    spotlightSeat(at.desk.id)
                    onFind()
                  }}
                  className="flex min-h-11 items-center gap-1.5 rounded-xl bg-default px-3 text-sm font-bold text-foreground"
                >
                  <MapPin className="size-4" /> {t("Find")}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * Who's in, beside the rail (desktop) — opened from it, like My bookings: the
 * list, and for admins the way to the people settings. Escape closes it.
 */
export const WhosInPanel = ({
  me,
  members,
  onClose,
}: {
  me: ShellMember
  members: ShellMember[]
  onClose: () => void
}) => {
  const { t } = useI18n()
  const { open: openSettings } = useSettings()

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => event.key === "Escape" && onClose()
    window.addEventListener("keydown", handleKey)

    return () => window.removeEventListener("keydown", handleKey)
  }, [onClose])

  return (
    <section
      aria-label={t("Who's in")}
      className={`${PANEL} absolute bottom-24 left-[5.75rem] top-24 flex w-[340px] flex-col p-4`}
    >
      <header className="mb-1 flex items-start justify-between gap-2">
        <h2 className="text-lg font-extrabold text-foreground">{t("Who's in")}</h2>
        <div className="flex items-center gap-1">
          {me.role === Role.ADMIN && (
            <button
              type="button"
              onClick={() => openSettings("org", "members")}
              className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-bold text-muted outline-none hover:bg-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
            >
              <Settings2 className="size-4" /> {t("Manage people")}
            </button>
          )}
          <CloseButton aria-label={t("Close who's in")} onPress={onClose} />
        </div>
      </header>
      {/* Find leaves it open: the map's beside it. */}
      <WhosInList me={me} members={members} onFind={() => {}} />
    </section>
  )
}
