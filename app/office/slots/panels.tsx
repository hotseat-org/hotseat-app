import { useEffect, useRef } from "react"
import { useRouteLink } from "../wayfinding/useRouteLink"
import { useDesksOnDay } from "../booking/useBooking"
import { useOfficeStore, useOfficeStoreApi } from "../store"
import { CustomBooking } from "../booking/CustomBooking"
import { HeatmapPill } from "../heatmap/HeatmapPill"
import { RoutePill } from "../wayfinding/RoutePill"
import { getFloorId } from "~/editor/core"
import { type Panel, type PanelProps } from "~/editor"
import { MOBILE_CHROME } from "~/components/office/mobile"

/**
 * Viewing: booking a desk on any days (the seat card's "Custom…"), and — top
 * centre — the way to a desk (where to, how far, share, close) and the
 * Insights heatmap's legend.
 */
const OfficeViewPanels = ({ isMobile, isDark }: PanelProps) => (
  <>
    <CustomBooking />
    <div
      className="absolute inset-x-0 flex flex-col items-center gap-2 px-4"
      style={{ top: isMobile ? MOBILE_CHROME.top + 12 : 84 }}
    >
      <RoutePill className="max-w-full" />
      <HeatmapPill isDark={isDark} className="max-w-full" />
    </div>
  </>
)

/** The ?to= link to a desk's way, kept in step with the route (see useRouteLink). */
const OfficeRouteLink = ({ isViewing }: PanelProps) => {
  // Its argument is whether the office is only being viewed (read-only).
  useRouteLink(isViewing)

  return null
}

/**
 * Opening an office of several floors, it shows the one with your desk that
 * day — once, when the bookings are in; not when a shared way to a desk
 * (?to=) shows its own.
 */
const OfficeStartFloor = () => {
  const store = useOfficeStoreApi()
  const me = useOfficeStore((state) => state.booking.me)
  const hasFloors = useOfficeStore((state) => state.floors.length > 1)
  const { byPerson } = useDesksOnDay()
  const myDesk = me ? byPerson.get(me)?.desk : undefined
  const isDone = useRef(false)

  useEffect(() => {
    if (isDone.current || !hasFloors || !me) return

    isDone.current = true
    const { route, floors, showFloor } = store.getState()
    if (route || !myDesk) return

    showFloor(getFloorId(myDesk, floors))
  }, [hasFloors, me, myDesk, store])

  return null
}

export const OFFICE_PANELS: Panel[] = [
  { Component: OfficeRouteLink, when: "always" },
  { Component: OfficeStartFloor, when: "viewing" },
  { Component: OfficeViewPanels, when: "viewing" },
]
