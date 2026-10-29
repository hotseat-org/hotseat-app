/** Per-browser view settings, remembered in localStorage. */

const writePref = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Storage blocked (private window…): the choice just won't be remembered.
  }
}

/** The measuring-hints switch is remembered per browser (on by default). */
const MEASURE_KEY = "office-editor:measure-hints"
export const readMeasurePref = () => {
  try {
    return localStorage.getItem(MEASURE_KEY) !== "off"
  } catch {
    return true
  }
}
export const writeMeasurePref = (on: boolean) => writePref(MEASURE_KEY, on ? "on" : "off")

/** What the map shows on top of the office — each can be hidden (Layers). */
export interface Layers {
  /** Team zones: their floor and names. */
  zones: boolean
  /** Viewing: who sits where, and which desks are free. */
  deskTags: boolean
  /** Editing: each room's floor area and desk count. */
  roomSizes: boolean
  /** Editing: the build grid. */
  grid: boolean
}

const DEFAULT_LAYERS: Layers = { zones: true, deskTags: true, roomSizes: true, grid: true }
const LAYERS_KEY = "office-editor:layers"
export const readLayers = (): Layers => {
  try {
    return { ...DEFAULT_LAYERS, ...JSON.parse(localStorage.getItem(LAYERS_KEY) ?? "{}") }
  } catch {
    return DEFAULT_LAYERS
  }
}
export const writeLayers = (layers: Layers) => writePref(LAYERS_KEY, JSON.stringify(layers))

/** The simple (2D) view's angle, in quarter turns — remembered per browser. */
const PLAN_TURN_KEY = "office-editor:plan-turn"
export const readPlanTurn = () => {
  try {
    return Number(localStorage.getItem(PLAN_TURN_KEY)) & 3
  } catch {
    return 0
  }
}
export const writePlanTurn = (planTurn: number) => writePref(PLAN_TURN_KEY, String(planTurn))

export type OfficeView = "3d" | "2d"
const VIEW_KEY = "office-editor:view"
/**
 * The viewer's chosen view, else a guess: the simple 2D plan on devices that
 * say they're constrained (little memory, data saver), the 3D scene otherwise.
 * (No WebGL at all forces 2D regardless — see OfficeEditor.)
 */
export const readViewPref = (): OfficeView => {
  try {
    const saved = localStorage.getItem(VIEW_KEY)
    if (saved === "2d" || saved === "3d") return saved
  } catch {
    // Storage blocked: fall through to the guess.
  }
  if (typeof navigator === "undefined") return "3d"
  const nav = navigator as Navigator & {
    deviceMemory?: number
    connection?: { saveData?: boolean }
  }
  const lowMemory = nav.deviceMemory !== undefined && nav.deviceMemory <= 2
  return lowMemory || nav.connection?.saveData ? "2d" : "3d"
}
export const writeViewPref = (view: OfficeView) => writePref(VIEW_KEY, view)
