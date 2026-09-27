import { createContext, useContext } from "react"

export interface XrayState {
  /** Segments currently cut down or easing (rendered separately, clipped). */
  active: Set<string>
  /** Current fade of a segment: 0 = solid … 1 = fully x-rayed. Read per frame. */
  fade: (id: string) => number
}

export const NO_XRAY: XrayState = { active: new Set(), fade: () => 0 }

/** The wall cutaway, provided by Scene (driven by WallXray). */
export const XrayContext = createContext<XrayState>(NO_XRAY)

export const useXray = () => useContext(XrayContext)
