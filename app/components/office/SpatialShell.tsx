import { useCallback, useEffect, useState } from "react"
import { PANEL, PANEL_HOVER, type ShellMember, type ShellOffice } from "./shell-ui"
import { SwitcherPage, WorkspaceSwitcher, type SwitcherMenu } from "./WorkspaceSwitcher"
import { PersonProfile } from "./PersonProfile"
import { WhosInModal } from "./WhosIn"
import { ColumnPage } from "./ColumnPage"
import { useDayStatus } from "./dayStatus"
import { SearchButton, SearchPage } from "./ShellSearch"
import { AccountMenu, AccountPage } from "./AccountMenu"
import { MyBookings } from "./MyBookings"
import { MobileShell } from "./MobileShell"
import { NotificationsButton, NotificationsPage } from "./Notifications"
import { InsightsDashboard } from "./InsightsDashboard"
import { HeadlineColumn } from "./HeadlineColumn"
import { SidePanelBadge, TimeOfDay, hasWebGL, useEditorStore, useSidePanels } from "~/editor"
import { useOfficeStore } from "~/office/store"
import { useOfficePanel, type OfficePanel } from "~/office/useOfficePanel"
import { FindSeatDialog } from "~/office/findSeat/FindSeatDialog"
import { useDesksOnDay } from "~/office/booking/useBooking"
import { useI18n } from "~/i18n/I18nProvider"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"
import { useIsMobile } from "~/utils/hooks/useIsMobile"

export type { ShellMember } from "./shell-ui"

/** The top bar's pages, opened in the column: search, what's new, your account. */
type BarPage = "search" | "notifications" | "account" | SwitcherMenu

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
}

/** One of the office's sections, as a word in the top bar. */
const NavLink = ({
  label,
  isCurrent,
  count = 0,
  onClick,
}: {
  label: string
  isCurrent: boolean
  /** A count beside it: who's in, the desk filters on. */
  count?: number
  onClick: () => void
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-current={isCurrent ? "page" : undefined}
    className={`relative flex h-11 items-center gap-1.5 rounded-xl px-2.5 text-base font-extrabold whitespace-nowrap outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus ${
      // One weight either way: the bar keeps its width as you move between pages.
      isCurrent ? "text-foreground" : "text-muted hover:text-foreground"
    }`}
  >
    {label}
    {count > 0 && <SidePanelBadge count={count} />}
    {/* The section you're in, underlined. */}
    {isCurrent && (
      <span
        aria-hidden
        className="absolute inset-x-2.5 bottom-1 h-[3px] rounded-full bg-foreground"
      />
    )}
  </button>
)

export const SpatialShell = ({
  offices,
  me,
  members,
  enterEdit,
  canEdit,
  empty = false,
}: Props) => {
  const { t } = useI18n()
  const hasHeatmap = useOfficeStore((s) => s.heatmap !== null)
  const isBooking = useOfficeStore((s) => s.booking.enabled)
  // A desk's card takes the left column (the headline's place) while it's open.
  const isDeskOpen = useOfficeStore((s) => s.seatCard !== null)
  const closeSeatCard = useOfficeStore((s) => s.closeSeatCard)
  const setHeatmap = useOfficeStore((s) => s.setHeatmap)
  const clearRoute = useOfficeStore((s) => s.clearRoute)
  const resetSpotlight = useOfficeStore((s) => s.resetSpotlight)
  // Frames the whole office again (the camera's default view).
  const requestFit = useEditorStore((state) => state.requestFit)
  // Who sits where on the shown day: permanent residents + bookings.
  const { byPerson } = useDesksOnDay()
  // The office's pages — who's in, your bookings, finding a seat, Insights —
  // one at a time, in the URL (see useOfficePanel).
  const officePanel = useOfficePanel()
  // The modules' side panels (the desk filter): the map's own tools, as a page.
  const sidePanels = useSidePanels(false)
  // The top bar's own pages — search, what's new, your account — in the same
  // column as the others (one thing in it at a time), not floating popups.
  const [barPage, setBarPage] = useState<BarPage | null>(null)
  const closeBarPage = useCallback(() => setBarPage(null), [])
  const toggleBarPage = useCallback(
    (page: BarPage) => {
      closeSeatCard()
      setBarPage((openPage) => {
        if (openPage === page) return null
        sidePanels.close()
        officePanel.close()

        return page
      })
    },
    [closeSeatCard, sidePanels, officePanel]
  )
  /** Open one of the pages (closing a side panel), or close it if it's open. */
  const togglePage = (panel: OfficePanel) => {
    sidePanels.close()
    closeSeatCard()
    setBarPage(null)
    if (officePanel.panel === panel) officePanel.close()
    else officePanel.open(panel)
  }
  /** A side panel's page in or out (it's not a route). */
  const toggleSidePanel = (id: string) => {
    officePanel.close()
    closeSeatCard()
    setBarPage(null)
    sidePanels.toggle(id)
  }
  // Your day: its actions under the headline.
  const day = useDayStatus(me, {
    onOpenBookings: () => {
      sidePanels.close()
      setBarPage(null)
      officePanel.open("bookings")
    },
    onFindSeat: () => {
      sidePanels.close()
      setBarPage(null)
      officePanel.open("find")
    },
  })

  // How many are in on the shown day: beside Who's in, at a glance.
  const inCount = members.filter((member) => byPerson.has(member.userEmail)).length

  // A desk opened (on the map, or from search) while a page is open: the page
  // gives the column to the desk.
  const hasPage = !!officePanel.panel || !!sidePanels.openPanel || !!barPage
  useEffect(() => {
    if (!isDeskOpen || !hasPage) return

    sidePanels.close()
    officePanel.close()
    setBarPage(null)
    // Only when a desk opens: a page opened later closes the desk itself.
  }, [isDeskOpen])

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

  const sidePanel = sidePanels.openPanel
  // A page takes the left column; the headline gives it the room.
  const isPageOpen = !!officePanel.panel || !!sidePanel || !!barPage
  const closeSidePanel = () => sidePanels.close()

  return (
    <>
      {/* The top bar: where you are, the office's sections, search, what's new, you.
          Below 1280px the sections take a row of their own under it. */}
      <div className="on-ground pointer-events-none absolute inset-x-5 top-5 flex flex-wrap items-center gap-x-2.5 gap-y-3">
        <WorkspaceSwitcher
          offices={offices}
          className="relative"
          column={{
            openMenu: barPage === "org" || barPage === "office" ? barPage : null,
            onToggle: toggleBarPage,
          }}
        />
        <span className="flex-1" />
        <div className="order-last basis-full min-[1280px]:order-none min-[1280px]:basis-auto">
          <nav aria-label={t("Primary")} className={`${PANEL} flex w-fit items-center gap-2`}>
            <NavLink
              label={t("Office")}
              isCurrent={!isPageOpen && !isDeskOpen && !hasHeatmap}
              // Back to the office as it opens: nothing open over it, the
              // heatmap off, the whole office in view (zoomed out).
              onClick={() => {
                sidePanels.close()
                setBarPage(null)
                closeSeatCard()
                officePanel.close()
                setHeatmap(null)
                clearRoute()
                resetSpotlight()
                requestFit()
              }}
            />
            <NavLink
              label={t("Who's in")}
              count={inCount}
              isCurrent={officePanel.panel === "people"}
              onClick={() => togglePage("people")}
            />
            <NavLink
              label={t("My bookings")}
              isCurrent={officePanel.panel === "bookings"}
              onClick={() => togglePage("bookings")}
            />
            {isBooking && (
              <NavLink
                label={t("Find a seat")}
                isCurrent={officePanel.panel === "find"}
                onClick={() => togglePage("find")}
              />
            )}
            {me.role === Role.ADMIN && (
              <NavLink
                label={t("Insights")}
                isCurrent={officePanel.panel === "insights" || hasHeatmap}
                onClick={() => togglePage("insights")}
              />
            )}
            {sidePanels.entries.map(({ panel, badgeCount }) => (
              <NavLink
                key={panel.id}
                label={t(panel.label)}
                count={badgeCount}
                isCurrent={sidePanel?.id === panel.id}
                onClick={() => toggleSidePanel(panel.id)}
              />
            ))}
          </nav>
        </div>
        <div className="pointer-events-auto">
          <SearchButton isOpen={barPage === "search"} onToggle={() => toggleBarPage("search")} />
        </div>
        <NotificationsButton
          isOpen={barPage === "notifications"}
          onToggle={() => toggleBarPage("notifications")}
          className={`${PANEL} ${PANEL_HOVER} pointer-events-auto grid size-11 cursor-pointer place-items-center rounded-full text-foreground outline-none focus-visible:ring-2 focus-visible:ring-focus`}
        />
        <AccountMenu
          column={{ isOpen: barPage === "account", onToggle: () => toggleBarPage("account") }}
        />
      </div>
      {barPage === "search" && <SearchPage members={members} onClose={closeBarPage} />}
      {barPage === "notifications" && <NotificationsPage onClose={closeBarPage} />}
      {barPage === "account" && <AccountPage onClose={closeBarPage} />}
      {(barPage === "org" || barPage === "office") && (
        <SwitcherPage offices={offices} menu={barPage} onClose={closeBarPage} />
      )}
      {!isPageOpen && !isDeskOpen && !barPage && (
        <HeadlineColumn me={me} members={members} day={day} />
      )}

      {officePanel.panel === "people" && (
        <WhosInModal me={me} members={members} onClose={officePanel.close} />
      )}
      <PersonProfile me={me} members={members} />
      {officePanel.panel === "bookings" && (
        <MyBookings
          onShow={officePanel.close}
          onFindSeat={() => officePanel.open("find")}
          frame={({ title, summary, body }) => (
            <ColumnPage
              label={t("My bookings")}
              title={title}
              summary={summary}
              onClose={officePanel.close}
            >
              {body}
            </ColumnPage>
          )}
        />
      )}
      {officePanel.panel === "find" && isBooking && <FindSeatDialog onClose={officePanel.close} />}
      {officePanel.panel === "insights" && me.role === Role.ADMIN && <InsightsDashboard />}
      {sidePanel && (
        <ColumnPage label={t(sidePanel.label)} title={t(sidePanel.label)} onClose={closeSidePanel}>
          <sidePanel.Component isEditing={false} close={closeSidePanel} />
        </ColumnPage>
      )}

      {/* No camera guide here (the editor has one): the bottom right is the time's. */}

      {/* Your team's day is in the headline's sentence (the phone keeps its card). */}

      {/* Bottom dock: real-time sync + time-of-day + edit */}
      <TimeOfDay isViewing>
        {/* Editing is 3D-only (no WebGL → view-only). */}
        {canEdit && hasWebGL() && (
          // A word, not a button: the office's one action is booking, not this.
          <button
            type="button"
            onClick={enterEdit}
            className="h-9 min-w-32 rounded-full px-3 text-[15px] font-extrabold text-foreground underline decoration-2 underline-offset-4 outline-none transition-colors hover:bg-surface-tertiary focus-visible:ring-2 focus-visible:ring-focus"
          >
            {t("Edit layout")}
          </button>
        )}
      </TimeOfDay>
    </>
  )
}
