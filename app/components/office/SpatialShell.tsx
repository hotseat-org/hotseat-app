import { type ReactNode } from "react"
import { Button } from "@heroui/react"
import { Armchair, BarChart3, Building2, Calendar, Pencil, Users } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { PANEL, PANEL_HOVER, type ShellMember, type ShellOffice } from "./shell-ui"
import { WorkspaceSwitcher } from "./WorkspaceSwitcher"
import { PersonProfile } from "./PersonProfile"
import { WhosInModal } from "./WhosIn"
import { TeamDayCard } from "./TeamDayCard"
import { RailModal } from "./RailModal"
import { useDayStatus } from "./dayStatus"
import { ShellSearch } from "./ShellSearch"
import { AccountMenu } from "./AccountMenu"
import { MyBookings } from "./MyBookings"
import { MobileShell } from "./MobileShell"
import { NotificationsBell } from "./Notifications"
import { InsightsDashboard } from "./InsightsDashboard"
import { HeadlineColumn } from "./HeadlineColumn"
import {
  REVEAL_LABEL,
  SidePanelBadge,
  SidePanelFlyout,
  TimeOfDay,
  hasWebGL,
  useSidePanels,
} from "~/editor"
import { useOfficeStore } from "~/office/store"
import { useOfficePanel, type OfficePanel } from "~/office/useOfficePanel"
import { FindSeatDialog } from "~/office/findSeat/FindSeatDialog"
import { useDesksOnDay } from "~/office/booking/useBooking"
import { useI18n } from "~/i18n/I18nProvider"
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
  /** The editor's camera controls guide, shown bottom right. */
  guide?: ReactNode
  /** Prototype: the day as a headline in a left column (`?look=headline`). */
  isHeadline?: boolean
}

interface RailItem {
  icon: LucideIcon
  label: string
  onClick?: () => void
  active?: boolean
  /** Not built yet: shown dimmed, not clickable (instead of a silent no-op). */
  disabled?: boolean
  /** A count on it: a side panel's (the desk filters on). */
  badge?: number
}

const RailLink = ({ icon: Icon, label, onClick, active, disabled, badge = 0 }: RailItem) => {
  const cls = `relative flex h-11 items-center rounded-xl px-3 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-focus ${
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
      {badge > 0 && (
        <span className="absolute left-7 top-1">
          <SidePanelBadge count={badge} />
        </span>
      )}
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
  isHeadline = false,
}: Props) => {
  const { t } = useI18n()
  const hasHeatmap = useOfficeStore((s) => s.heatmap !== null)
  const isBooking = useOfficeStore((s) => s.booking.enabled)
  // Who sits where on the shown day: permanent residents + bookings.
  const { byPerson } = useDesksOnDay()
  // The rail's modals — who's in, your bookings, Insights — one at a time, in
  // the URL (see useOfficePanel).
  const officePanel = useOfficePanel()
  // The modules' side panels (the desk filter): the map's own tools, beside
  // the rail, while the map stays in view.
  const sidePanels = useSidePanels(false)
  /** Open one of the rail's modals (closing a side panel), or close it if it's open. */
  const toggleModal = (panel: OfficePanel) => {
    sidePanels.close()
    if (officePanel.panel === panel) officePanel.close()
    else officePanel.open(panel)
  }
  // Your day, by your avatar (top right).
  const day = useDayStatus(me, {
    onOpenBookings: () => {
      sidePanels.close()
      officePanel.open("bookings")
    },
    onFindSeat: () => {
      sidePanels.close()
      officePanel.open("find")
    },
  })

  // How many are in on the shown day: on Who's in's button, at a glance.
  const inCount = members.filter((member) => byPerson.has(member.userEmail)).length

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
      {isHeadline && <HeadlineColumn me={me} members={members} />}

      {/* Left rail */}
      <nav
        className={`${PANEL} group/bar absolute left-5 top-1/2 flex -translate-y-1/2 flex-col gap-1.5 p-2`}
        aria-label={t("Primary")}
      >
        <RailLink
          icon={Building2}
          label={t("Office")}
          active={!officePanel.panel && !hasHeatmap && !sidePanels.openPanel}
          onClick={() => {
            sidePanels.close()
            officePanel.close()
          }}
        />
        {/* Who's in on the shown day (admins manage people from there). */}
        <RailLink
          icon={Users}
          label={t("Who's in")}
          badge={inCount}
          active={officePanel.panel === "people"}
          onClick={() => toggleModal("people")}
        />
        <RailLink
          icon={Calendar}
          label={t("Bookings")}
          active={officePanel.panel === "bookings"}
          onClick={() => toggleModal("bookings")}
        />
        {isBooking && (
          <RailLink
            icon={Armchair}
            label={t("Find a seat")}
            active={officePanel.panel === "find"}
            onClick={() => toggleModal("find")}
          />
        )}
        {me.role === Role.ADMIN && (
          <RailLink
            icon={BarChart3}
            label={t("Insights")}
            active={officePanel.panel === "insights" || hasHeatmap}
            onClick={() => toggleModal("insights")}
          />
        )}
        {sidePanels.entries.length > 0 && <div className="mx-2 h-px shrink-0 bg-separator" />}
        {sidePanels.entries.map(({ panel, badgeCount }) => (
          <RailLink
            key={panel.id}
            icon={panel.icon}
            label={t(panel.label)}
            badge={badgeCount}
            active={sidePanels.openPanel?.id === panel.id}
            onClick={() => {
              officePanel.close()
              sidePanels.toggle(panel.id)
            }}
          />
        ))}
        {sidePanels.openPanel && <SidePanelFlyout panel={sidePanels.openPanel} isEditing={false} />}
      </nav>
      {officePanel.panel === "people" && (
        <WhosInModal me={me} members={members} onClose={officePanel.close} />
      )}
      <PersonProfile me={me} members={members} />
      {officePanel.panel === "bookings" && (
        <RailModal title={t("My bookings")} onClose={officePanel.close}>
          <MyBookings onShow={officePanel.close} onFindSeat={() => officePanel.open("find")} />
        </RailModal>
      )}
      {officePanel.panel === "find" && isBooking && <FindSeatDialog onClose={officePanel.close} />}
      {officePanel.panel === "insights" && me.role === Role.ADMIN && <InsightsDashboard />}

      {/* Top-right: search + notifications + account */}
      <div className="pointer-events-none absolute right-5 top-5 flex items-center gap-2.5">
        <div className="pointer-events-auto">
          <ShellSearch members={members} />
        </div>
        <NotificationsBell
          triggerClassName={`${PANEL} ${PANEL_HOVER} pointer-events-auto grid size-11 cursor-pointer place-items-center text-foreground outline-none focus-visible:ring-2 focus-visible:ring-focus`}
        />
        <AccountMenu day={day} />
      </div>

      {/* The editor's camera controls guide, bottom right. */}
      {guide && <div className="pointer-events-none absolute bottom-4 right-5">{guide}</div>}

      {/* Above the dock, on a day your team comes in together. */}
      {isBooking && (
        <TeamDayCard
          me={me}
          members={members}
          onFindSeat={() => officePanel.open("find")}
          className="absolute bottom-24 left-1/2 w-[min(380px,90vw)] -translate-x-1/2"
        />
      )}

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
