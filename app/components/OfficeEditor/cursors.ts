import { createContext } from "react"
import { isEdgeType, type Tool } from "./types"

// Editor cursors: small SVGs in the editor palette — dark ink with a light
// halo (readable on the light and dark scenes), denim for active states.
// Colours are fixed: a cursor image can't read the theme's CSS variables.
const INK = "#33384a"
const HALO = "#fbf6ee"
const ACCENT = "#4a6fae"

/** A stroked line drawing, haloed. */
const line = (d: string, color = INK) =>
  `<path d="${d}" fill="none" stroke="${HALO}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>` +
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`

/** A filled shape, haloed. */
const shape = (d: string, color = INK) =>
  `<path d="${d}" fill="none" stroke="${HALO}" stroke-width="3" stroke-linejoin="round"/>` +
  `<path d="${d}" fill="${color}" stroke="${color}" stroke-width="1" stroke-linejoin="round"/>`

/**
 * A multi-stroke icon (lucide's hands): a light palm, one halo under all
 * strokes, then the ink — so the hand reads solid on a dark floor too.
 */
const PALM = "M6 11 H22 V15 A7 7 0 0 1 15 22 H11.5 A5.5 5.5 0 0 1 6 16.5 Z"
const glyph = (ds: string[]) =>
  `<path d="${PALM}" fill="${HALO}"/>` +
  ds
    .map(
      (d) =>
        `<path d="${d}" fill="none" stroke="${HALO}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`
    )
    .join("") +
  ds
    .map(
      (d) =>
        `<path d="${d}" fill="none" stroke="${INK}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>`
    )
    .join("")

const compose = (body: string, x: number, y: number, fallback: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">${body}</svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${x} ${y}, ${fallback}`
}

const ARROW = "M5 3 L5 18.5 L9.2 14.6 L11.9 20.6 L14.6 19.4 L11.9 13.5 L17.6 13.3 Z"
const MOVE_ARROWS =
  "M12 3 V21 M3 12 H21 M12 3 L9.5 5.5 M12 3 L14.5 5.5 M12 21 L9.5 18.5 M12 21 L14.5 18.5 " +
  "M3 12 L5.5 9.5 M3 12 L5.5 14.5 M21 12 L18.5 9.5 M21 12 L18.5 14.5"
const LENS = "M10 4 A6 6 0 1 1 9.99 4 Z M14.5 14.5 L20 20"

/** A double-headed arrow, turned `degrees` clockwise from horizontal. */
function resizeCursor(degrees: number) {
  const arrow = line("M4 12 H20 M4 12 L7.5 8.5 M4 12 L7.5 15.5 M20 12 L16.5 8.5 M20 12 L16.5 15.5")
  return compose(`<g transform="rotate(${degrees} 12 12)">${arrow}</g>`, 12, 12, "move")
}

export const CURSORS = {
  select: compose(shape(ARROW), 5, 3, "default"),
  /** Furniture tools: the arrow with a "+" badge. */
  place: compose(
    shape(ARROW) +
      shape("M17 13 a4.5 4.5 0 1 1 -0.01 0 Z", ACCENT) +
      `<path d="M17 15.5 V20.5 M14.5 18 H19.5" stroke="${HALO}" stroke-width="1.6" stroke-linecap="round"/>`,
    5,
    3,
    "copy"
  ),
  /** Wall / room / door / window tools: a crosshair on the grid point. */
  build: compose(
    line("M12 2 V8 M12 16 V22 M2 12 H8 M16 12 H22") +
      shape("M12 10.6 a1.4 1.4 0 1 1 -0.01 0 Z", ACCENT),
    12,
    12,
    "crosshair"
  ),
  erase: compose(
    shape("M14 3.5 L20.5 10 L12 18.5 H7 L3.5 15 Z") +
      `<path d="M8.6 9 L15 15.4" stroke="${HALO}" stroke-width="1.5"/>`,
    4,
    15,
    "crosshair"
  ),
  paint: compose(
    shape("M12 3 C12 3 6 10 6 14.5 A6 6 0 0 0 18 14.5 C18 10 12 3 12 3 Z", ACCENT),
    12,
    20,
    "crosshair"
  ),
  /** Over something the Select tool picks up (lucide `hand`). */
  grab: compose(
    glyph([
      "M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2",
      "M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2",
      "M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8",
      "M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15",
    ]),
    12,
    8,
    "grab"
  ),
  /** Over something clickable in display mode — a desk (lucide `pointer`). */
  point: compose(
    glyph([
      "M22 14a8 8 0 0 1-8 8",
      "M18 11v-1a2 2 0 0 0-2-2a2 2 0 0 0-2 2",
      "M14 10V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1",
      "M10 9.5V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v10",
      "M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15",
    ]),
    8,
    2,
    "pointer"
  ),
  /** Ready to pan (Space held). */
  pan: compose(line(MOVE_ARROWS), 12, 12, "grab"),
  /** Panning. */
  panning: compose(line(MOVE_ARROWS, ACCENT), 12, 12, "grabbing"),
  orbit: compose(
    line("M19 12 A7 7 0 1 1 16.95 7.05 M19 3.5 V8 H14.5", ACCENT) +
      shape("M12 10.6 a1.4 1.4 0 1 1 -0.01 0 Z"),
    12,
    12,
    "move"
  ),
  /** Over a wall's foot (Select): drag it sideways — the arrow across the wall, as seen. */
  resize0: resizeCursor(0),
  resize45: resizeCursor(45),
  resize90: resizeCursor(90),
  resize135: resizeCursor(135),
  zoomIn: compose(line(LENS) + line("M7.5 10 H12.5 M10 7.5 V12.5", ACCENT), 10, 10, "zoom-in"),
  zoomOut: compose(line(LENS) + line("M7.5 10 H12.5", ACCENT), 10, 10, "zoom-out"),
}

/** The canvas cursor for a tool (when no camera gesture is going on). */
export const getToolCursor = (tool: Tool, isFurniture: boolean) => {
  if (tool === "select") return CURSORS.select
  if (tool === "delete") return CURSORS.erase
  if (tool === "paint") return CURSORS.paint
  if (tool === "room" || isEdgeType(tool)) return CURSORS.build
  return isFurniture ? CURSORS.place : CURSORS.select
}

/** What a click on the hovered thing would do: pick it up, open it (a desk in view mode), or drag a wall. */
export type CursorHint = "grab" | "point" | "resize0" | "resize45" | "resize90" | "resize135"

/**
 * Hovered pieces report their hint here (by id; null when the hover ends).
 * Provided by Scene, shown by CameraControls — under any camera gesture.
 */
export const CursorHintContext = createContext<(id: string, hint: CursorHint | null) => void>(
  () => {}
)
