import { useRouteLink } from "../wayfinding/useRouteLink"
import { CustomBooking } from "../booking/CustomBooking"
import { HeatmapPill } from "../heatmap/HeatmapPill"
import { RoutePill } from "../wayfinding/RoutePill"
import type { Panel, PanelProps } from "~/editor/module"
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

export const OFFICE_PANELS: Panel[] = [
  { Component: OfficeRouteLink, when: "always" },
  { Component: OfficeViewPanels, when: "viewing" },
]
