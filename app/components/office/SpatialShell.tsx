import { useMemo, useState, type ReactNode } from "react"
import { Button, Chip } from "@heroui/react"
import { BarChart3, Building2, Calendar, Hourglass, MapPin, Pencil, Pin, Users } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import {
  MemberAvatar,
  PANEL,
  PANEL_HOVER,
  nameOf,
  roleLabel,
  type ShellMember,
  type ShellOffice,
} from "./shell-ui"
import { WorkspaceSwitcher } from "./WorkspaceSwitcher"
import { ShellSearch } from "./ShellSearch"
import { AccountMenu } from "./AccountMenu"
import { MyBookings } from "./MyBookings"
import { MobileShell } from "./MobileShell"
import { NotificationsBell } from "./Notifications"
import { WeekDots } from "./WeekDots"
import { InsightsDashboard } from "./InsightsDashboard"
import { REVEAL_LABEL } from "~/editor/ui/bars/revealLabel"
import { useEditorStore } from "~/editor/store"
import { TimeOfDay } from "~/editor/ui/bars/TimeOfDay"
import { hasWebGL } from "~/editor/shell/webgl"
import {
  dayPhrase,
  useDesksOnDay,
  useGivenUpDesk,
  useWaitlist,
  useWeekPresence,
} from "~/office/booking/useBooking"
import { useI18n } from "~/i18n/I18nProvider"
import { useSettings } from "~/components/settings/useSettings"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"
import { useIsMobile } from "~/utils/hooks/useIsMobile"

export type { ShellMember } from "./shell-ui"

interface Props {
  /** Offices in the current org (for the office switcher). */
  offices: ShellOffice[]
  me: ShellMember
  members: ShellMember[]
  /** Switch the editor into edit mode. */
  enterEdit: () => void
  /** May this person edit the layout (admins)? */
  canEdit: boolean
  /** Office has no layout yet: only the switcher + account (like the empty-org screen). */
  empty?: boolean
  /** The editor's camera controls guide, shown under the presence panel. */
  guide?: ReactNode
}

interface RailItem {
  icon: LucideIcon
  label: string
  onClick?: () => void
  active?: boolean
  /** Not built yet: shown dimmed, not clickable (instead of a silent no-op). */
  disabled?: boolean
}

const RailLink = ({ icon: Icon, label, onClick, active, disabled }: RailItem) => {
  const cls = `flex h-11 items-center rounded-xl px-3 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-focus ${
    active
      ? "bg-accent text-accent-foreground"
      : disabled
        ? "cursor-not-allowed text-muted/40"
        : "text-muted hover:bg-foreground/10 hover:text-foreground"
  }`
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      aria-disabled={disabled || undefined}
      aria-current={active ? "page" : undefined}
      aria-label={label}
      className={cls}
    >
      <Icon className="size-5 shrink-0" />
      <span className={REVEAL_LABEL}>{label}</span>
    </button>
  )
}

export const SpatialShell = ({
  offices,
  me,
  members,
  enterEdit,
  canEdit,
  empty = false,
  guide,
}: Props) => {
  const i18n = useI18n()
  const { t, tn, format } = i18n
  const { open: openSettings } = useSettings()
  // Who sits where on the shown day: permanent residents + bookings.
  const day = useEditorStore((s) => s.booking.day)
  const showRoute = useEditorStore((s) => s.showRoute)
  const isInsightsOpen = useEditorStore((s) => s.isInsightsOpen)
  const setInsightsOpen = useEditorStore((s) => s.setInsightsOpen)
  const hasHeatmap = useEditorStore((s) => s.heatmap !== null)
  const today = useEditorStore((s) => s.booking.today)
  const { byPerson } = useDesksOnDay()
  const [bookingsOpen, setBookingsOpen] = useState(false)
  const mine = byPerson.get(me.userEmail)
  const givenUp = useGivenUpDesk(me.userEmail)
  const waitlist = useWaitlist()
  const week = useWeekPresence()

  // People with a desk that day first, then everyone else (original order).
  const roster = useMemo(
    () =>
      members
        .map((m, i) => ({ m, i, at: byPerson.get(m.userEmail) }))
        .sort((a, b) => Number(!a.at) - Number(!b.at) || a.i - b.i),
    [members, byPerson]
  )
  const inCount = roster.filter((r) => r.at).length

  // Phones get their own shell: tab bar, day strip, bottom sheets.
  const isMobile = useIsMobile()
  if (isMobile) return <MobileShell offices={offices} me={me} members={members} empty={empty} />

  // Empty office: the first-run card is the whole page; keep just where you are
  // (switcher) and who you are (account).
  if (empty)
    return (
      <>
        <WorkspaceSwitcher offices={offices} />
        <div className="pointer-events-none absolute right-5 top-5 flex items-center gap-2.5">
          <AccountMenu />
        </div>
      </>
    )

  return (
    <>
      <WorkspaceSwitcher offices={offices} />

      {/* Left rail */}
      <nav
        className={`${PANEL} group/bar absolute left-5 top-1/2 flex -translate-y-1/2 flex-col gap-1.5 p-2`}
        aria-label={t("Primary")}
      >
        <RailLink
          icon={Building2}
          label={t("Office")}
          active={!bookingsOpen && !isInsightsOpen && !hasHeatmap}
          onClick={() => setBookingsOpen(false)}
        />
        {/* Members is an admin page; the roster on the right is everyone's. */}
        {me.role === Role.ADMIN && (
          <RailLink
            icon={Users}
            label={t("People")}
            onClick={() => openSettings("org", "members")}
          />
        )}
        <RailLink
          icon={Calendar}
          label={t("Bookings")}
          active={bookingsOpen}
          onClick={() => setBookingsOpen((o) => !o)}
        />
        {me.role === Role.ADMIN && (
          <RailLink
            icon={BarChart3}
            label={t("Insights")}
            active={isInsightsOpen || hasHeatmap}
            onClick={() => setInsightsOpen(true)}
          />
        )}
      </nav>
      {isInsightsOpen && <InsightsDashboard />}

      {/* Top-right: search + notifications + account */}
      <div className="pointer-events-none absolute right-5 top-5 flex items-center gap-2.5">
        <div className="pointer-events-auto">
          <ShellSearch members={members} />
        </div>
        <NotificationsBell
          triggerClassName={`${PANEL} ${PANEL_HOVER} pointer-events-auto grid size-11 cursor-pointer place-items-center text-foreground outline-none focus-visible:ring-2 focus-visible:ring-focus`}
        />
        <AccountMenu />
      </div>

      {bookingsOpen && <MyBookings onClose={() => setBookingsOpen(false)} />}

      {/* Right stack: You + presence */}
      <div className="pointer-events-none absolute bottom-24 right-5 top-24 flex w-[320px] flex-col gap-3.5">
        <div className={`${PANEL} p-4`}>
          <div className="flex items-center gap-3.5">
            <MemberAvatar m={me} className="size-13 rounded-2xl" />
            <div className="min-w-0">
              <h3 className="truncate text-base font-extrabold text-foreground">{nameOf(me)}</h3>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                {mine?.state.kind === "resident" ? (
                  <>
                    <Pin className="size-3.5" />{" "}
                    {mine.desk.label
                      ? t("Permanent desk {label}", { label: mine.desk.label })
                      : t("Permanent desk")}
                  </>
                ) : mine ? (
                  <>
                    <MapPin className="size-3.5" />{" "}
                    {mine.desk.label
                      ? t("Desk {label} {when}", {
                          label: mine.desk.label,
                          when: dayPhrase(i18n, day, today),
                        })
                      : t("You have a desk {when}", { when: dayPhrase(i18n, day, today) })}
                  </>
                ) : givenUp ? (
                  <>
                    <Pin className="size-3.5" />{" "}
                    {t("Away {when} — you gave your desk up.", {
                      when: dayPhrase(i18n, day, today),
                    })}
                  </>
                ) : waitlist.isWaiting ? (
                  <>
                    <Hourglass className="size-3.5" />{" "}
                    {t("On the waitlist {when}", { when: dayPhrase(i18n, day, today) })}
                    {waitlist.count > 1 &&
                      ` ${tn(waitlist.count, "({n} waiting)", "({n} waiting)")}`}{" "}
                    ·{" "}
                    <button
                      type="button"
                      onClick={waitlist.leave}
                      className="font-bold text-accent hover:underline"
                    >
                      {t("Leave")}
                    </button>
                  </>
                ) : waitlist.canWait ? (
                  <>
                    <Hourglass className="size-3.5" />{" "}
                    {t("Office full {when}", { when: dayPhrase(i18n, day, today) })} ·{" "}
                    <button
                      type="button"
                      onClick={waitlist.join}
                      className="font-bold text-accent hover:underline"
                    >
                      {t("Join the waitlist")}
                    </button>
                  </>
                ) : (
                  <>
                    <MapPin className="size-3.5" />{" "}
                    {t("No desk {when}.", { when: dayPhrase(i18n, day, today) })}
                    {day >= today && ` ${t("Click a free one.")}`}
                  </>
                )}
              </p>
              <div className="mt-1 flex gap-3">
                <button
                  type="button"
                  onClick={() => setBookingsOpen(true)}
                  className="text-xs font-bold text-accent hover:underline"
                >
                  {t("All my bookings")}
                </button>
                {mine && (
                  <button
                    type="button"
                    onClick={() => showRoute(mine.desk.id)}
                    className="text-xs font-bold text-accent hover:underline"
                  >
                    {t("Show the way")}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={`${PANEL} flex min-h-0 flex-1 flex-col p-4`}>
          <header className="mb-3 flex items-end justify-between">
            <div>
              <p className="text-[0.64rem] font-extrabold uppercase tracking-wider text-muted">
                {day === today ? t("In today") : t("In {when}", { when: format.onDay(day) })}
              </p>
              <p className="text-2xl font-extrabold tabular-nums text-foreground">
                {inCount}{" "}
                <span className="text-sm font-bold text-muted">
                  {t("of {total}", { total: members.length })}
                </span>
              </p>
            </div>
          </header>
          {members.length <= 1 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8 text-center">
              <div className="grid size-11 place-items-center rounded-2xl bg-accent/12 text-accent">
                <Users className="size-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{t("It's just you so far")}</p>
                {me.role === Role.ADMIN && (
                  <p className="mt-0.5 text-xs text-muted">
                    {t("Invite your team so they can grab a seat.")}
                  </p>
                )}
              </div>
              {/* Inviting is an admin's. */}
              {me.role === Role.ADMIN && (
                <button
                  type="button"
                  onClick={() => openSettings("org", "invitations")}
                  className="rounded-xl bg-accent/15 px-3.5 py-2 text-sm font-bold text-accent transition hover:bg-accent/25"
                >
                  {t("Invite teammates")}
                </button>
              )}
            </div>
          ) : (
            <>
              {inCount === 0 && (
                <p className="mb-2 rounded-lg bg-foreground/5 px-3 py-2 text-xs text-muted">
                  {t("Nobody has a desk {when} yet.", { when: dayPhrase(i18n, day, today) })}
                </p>
              )}
              <ul className="-mx-1 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-1">
                {roster.map(({ m, at }) => {
                  return (
                    <li
                      key={m.userEmail}
                      className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-foreground/5"
                    >
                      <MemberAvatar m={m} className="size-9 rounded-xl" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-foreground">{nameOf(m)}</p>
                        <p className="flex items-center gap-2 text-xs capitalize text-muted">
                          {/* Fixed width: every row's dots start at the same spot. */}
                          <span className="w-14 shrink-0 truncate">{roleLabel(i18n, m.role)}</span>
                          <WeekDots email={m.userEmail} presence={week} />
                        </p>
                      </div>
                      <Chip size="sm" variant="soft" color={at ? "success" : "default"}>
                        {at ? (at.desk.label ?? t("In")) : t("Not in")}
                      </Chip>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>
        {guide && <div className="shrink-0 self-end">{guide}</div>}
      </div>

      {/* Bottom dock: real-time sync + time-of-day + edit */}
      <TimeOfDay isViewing>
        {/* Editing is 3D-only (no WebGL → view-only). */}
        {canEdit && hasWebGL() && (
          <Button variant="primary" size="sm" className="min-w-32" onPress={enterEdit}>
            <Pencil className="size-4" />
            {t("Edit layout")}
          </Button>
        )}
      </TimeOfDay>
    </>
  )
}
