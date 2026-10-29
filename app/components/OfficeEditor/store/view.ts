import {
  readLayers,
  readMeasurePref,
  readPlanTurn,
  readViewPref,
  writeLayers,
  writeMeasurePref,
  writePlanTurn,
  writeViewPref,
  type Layers,
  type OfficeView,
} from "./preferences"
import type { GetState, SetState } from "./state"

/** How the office is shown: time of day, view, layers, and where to look. */
export interface ViewSlice {
  /** Time of day in hours [0,24) driving the scene lighting. */
  timeOfDay: number
  /** Manually set the time of day — this stops following the real clock. */
  setTimeOfDay: (hour: number) => void
  /** Follow the real local time (the default); moving the slider turns it off. */
  syncTime: boolean
  /** Follow (or stop following) the real clock; turning on jumps to now. */
  setSyncTime: (on: boolean) => void
  /** Re-read the real clock if syncing (called on mount + every minute). */
  tickClock: () => void
  /**
   * How the office is shown in view mode: the 3D scene, or the simple 2D
   * floor plan (low-powered devices). A per-viewer preference; editing is 3D.
   */
  view: OfficeView
  setView: (view: OfficeView) => void
  layers: Layers
  toggleLayer: (layer: keyof Layers) => void
  /** The simple view turned by this many quarter turns. */
  planTurn: number
  /** Turn the simple view a quarter (1: left, −1: right). */
  turnPlan: (quarters: number) => void
  /** Distance labels + alignment guides while placing/carrying (a per-viewer preference). */
  measureHints: boolean
  toggleMeasureHints: () => void
  /** The frame-rate readout (3D). */
  isFrameRateShown: boolean
  toggleFrameRate: () => void
  /** View: show only desks with all these features (others dimmed). */
  deskFilter: string[]
  toggleDeskFilter: (feature: string) => void
  /** Insights (admins): each desk's share of working days in use, for a period, over the office. */
  heatmap: { period: "4w" | "12w" | "next"; ratios: Record<string, number> } | null
  setHeatmap: (heatmap: ViewSlice["heatmap"]) => void
  /** Plan: a desk to bring into view and highlight ("Show my desk", "Find"); the plan clears it once shown. */
  spotlight: { id: string } | null
  spotlightSeat: (id: string) => void
  resetSpotlight: () => void
  /**
   * Wayfinding: the desk whose way is shown (see wayfinding.ts) — drawn on the
   * floor in both views until closed. `from`: start at your own desk when you
   * have one that day (the default), or the nearest entrance. `nonce`
   * re-frames the view when asked again or switched.
   */
  route: { deskId: string; from: "desk" | "entrance"; nonce: number } | null
  showRoute: (deskId: string) => void
  setRouteFrom: (from: "desk" | "entrance") => void
  clearRoute: () => void
  /** Bumped to ask the camera to frame the whole office (see CameraFit). */
  fitNonce: number
  requestFit: () => void
}

/** The viewer's local wall-clock time in hours [0,24), minute precision. */
export const nowHours = () => {
  const d = new Date()
  return d.getHours() + d.getMinutes() / 60
}

export const createViewSlice = (set: SetState, get: GetState): ViewSlice => ({
  // Server-safe default; the real time is applied on mount (client clock + TZ).
  timeOfDay: 13,
  setTimeOfDay: (hour) => set({ timeOfDay: ((hour % 24) + 24) % 24, syncTime: false }),
  syncTime: true,
  setSyncTime: (on) => set(on ? { syncTime: true, timeOfDay: nowHours() } : { syncTime: false }),
  tickClock: () => {
    if (get().syncTime) set({ timeOfDay: nowHours() })
  },
  view: readViewPref(),
  setView: (view) => {
    writeViewPref(view)
    set({ view })
  },
  layers: readLayers(),
  toggleLayer: (layer) =>
    set((s) => {
      const layers = { ...s.layers, [layer]: !s.layers[layer] }
      writeLayers(layers)
      return { layers }
    }),
  planTurn: readPlanTurn(),
  turnPlan: (quarters) =>
    set((s) => {
      const planTurn = (s.planTurn + quarters) & 3
      writePlanTurn(planTurn)
      return { planTurn }
    }),
  measureHints: readMeasurePref(),
  toggleMeasureHints: () =>
    set((s) => {
      writeMeasurePref(!s.measureHints)
      return { measureHints: !s.measureHints }
    }),
  isFrameRateShown: false,
  toggleFrameRate: () => set((s) => ({ isFrameRateShown: !s.isFrameRateShown })),
  deskFilter: [],
  toggleDeskFilter: (feature) =>
    set((s) => ({
      deskFilter: s.deskFilter.includes(feature)
        ? s.deskFilter.filter((f) => f !== feature)
        : [...s.deskFilter, feature],
    })),
  heatmap: null,
  setHeatmap: (heatmap) => set({ heatmap, seatCard: null }),
  spotlight: null,
  spotlightSeat: (id) => set({ spotlight: { id }, seatCard: null }),
  resetSpotlight: () => set({ spotlight: null }),
  route: null,
  showRoute: (deskId) =>
    set((s) => ({
      route: { deskId, from: "desk", nonce: (s.route?.nonce ?? 0) + 1 },
      seatCard: null,
    })),
  setRouteFrom: (from) =>
    set((s) => (s.route ? { route: { ...s.route, from, nonce: s.route.nonce + 1 } } : {})),
  clearRoute: () => set({ route: null }),
  fitNonce: 0,
  requestFit: () => set((s) => ({ fitNonce: s.fitNonce + 1 })),
})
