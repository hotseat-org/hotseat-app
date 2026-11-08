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
import type { GetState, SetState, StoreHooks } from "./state"

/** How the office is shown: time of day, view, layers, and where to look. */
/** A rectangle of floor (m). */
export interface FloorArea {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

/** What points at a piece: the scene itself, or its tag or deskmate over it. */
export type HoverSource = "scene" | "tag" | "deskmate"

export interface ViewState {
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
  /**
   * Viewing: the clickable piece pointed at (a desk — its tag grows with it),
   * or none, and by what: the scene, or its tag or deskmate over it.
   */
  hoveredPieceId: string | null
  hoveredPieceSource: HoverSource
  setHoveredPiece: (id: string | null, source?: HoverSource) => void
  /** Lets go of it, only if it's still pointed at the same way (another may have taken over). */
  clearHoveredPiece: (id: string, source?: HoverSource) => void
  /** Viewing: the lift whose floor buttons are open (pressed on the map), or none. */
  liftPanelId: string | null
  setLiftPanel: (id: string | null) => void
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
  /** Bumped to ask the camera to frame the whole office (see CameraFit). */
  fitNonce: number
  requestFit: () => void
  /** An area the camera is asked to frame (see CameraFit) — a module's: the way to a desk. */
  frameRequest: { bounds: FloorArea; nonce: number } | null
  requestFrame: (bounds: FloorArea) => void
  /** The camera is zoomed in closer than the whole office's fit (see CameraFit). */
  isZoomedIn: boolean
  setZoomedIn: (isZoomedIn: boolean) => void
  /** Whether the office reaches under the app's text column on the left (see CameraFit). */
  isOfficeUnderColumn: boolean
  setOfficeUnderColumn: (isOfficeUnderColumn: boolean) => void
}

/** The viewer's local wall-clock time in hours [0,24), minute precision. */
export const nowHours = () => {
  const now = new Date()

  return now.getHours() + now.getMinutes() / 60
}

export const createViewState = (set: SetState, get: GetState, hooks: StoreHooks): ViewState => ({
  // Server-safe default; the real time is applied on mount (client clock + TZ).
  timeOfDay: 13,
  setTimeOfDay: (hour) => set({ timeOfDay: ((hour % 24) + 24) % 24, syncTime: false }),
  syncTime: true,
  setSyncTime: (on) => set(on ? { syncTime: true, timeOfDay: nowHours() } : { syncTime: false }),
  tickClock: () => {
    if (get().syncTime) set({ timeOfDay: nowHours() })
  },
  hoveredPieceId: null,
  hoveredPieceSource: "scene",
  setHoveredPiece: (hoveredPieceId, hoveredPieceSource = "scene") =>
    set({ hoveredPieceId, hoveredPieceSource }),
  clearHoveredPiece: (id, source = "scene") => {
    const { hoveredPieceId, hoveredPieceSource } = get()
    if (hoveredPieceId === id && hoveredPieceSource === source)
      set({ hoveredPieceId: null, hoveredPieceSource: "scene" })
  },
  liftPanelId: null,
  setLiftPanel: (liftPanelId) => set({ liftPanelId }),
  view: readViewPref(),
  setView: (view) => {
    writeViewPref(view)
    set({ view })
  },
  layers: readLayers(hooks.defaultLayers),
  toggleLayer: (layer) =>
    set((state) => {
      const layers = { ...state.layers, [layer]: !state.layers[layer] }
      writeLayers(layers)

      return { layers }
    }),
  planTurn: readPlanTurn(),
  turnPlan: (quarters) =>
    set((state) => {
      const planTurn = (state.planTurn + quarters) & 3
      writePlanTurn(planTurn)

      return { planTurn }
    }),
  measureHints: readMeasurePref(),
  toggleMeasureHints: () =>
    set((state) => {
      writeMeasurePref(!state.measureHints)

      return { measureHints: !state.measureHints }
    }),
  isFrameRateShown: false,
  toggleFrameRate: () => set((state) => ({ isFrameRateShown: !state.isFrameRateShown })),
  fitNonce: 0,
  requestFit: () => set((state) => ({ fitNonce: state.fitNonce + 1 })),
  frameRequest: null,
  requestFrame: (bounds) =>
    set((state) => ({ frameRequest: { bounds, nonce: (state.frameRequest?.nonce ?? 0) + 1 } })),
  isZoomedIn: false,
  setZoomedIn: (isZoomedIn) => set({ isZoomedIn }),
  isOfficeUnderColumn: false,
  setOfficeUnderColumn: (isOfficeUnderColumn) => set({ isOfficeUnderColumn }),
})
