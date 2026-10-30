/**
 * A regular office palette — warm, slightly-desaturated naturals — with only a
 * hint of outrun (a soft neon `ACCENT` used sparingly, e.g. the monitor glow).
 */
export const PALETTE = {
  wall: "#efe7db",
  wallTrim: "#e2d6c4",
  door: "#d98a63",
  /** Doors are wood, never painted: a warm leaf in a darker frame (the desk legs' wood). */
  doorLeaf: "#b8865a",
  doorFrame: "#8f6a4a",
  doorHandle: "#e8c07a",
  deskTop: "#c9946a",
  deskLeg: "#8f6a4a",
  seat: "#6d90c9",
  seatDark: "#5878ab",
  seatLeg: "#3d4657",
  plantLeaf: "#7fa66a",
  plantLeafDark: "#6b9159",
  pot: "#c9765a",
  floor: "#e6d7bf",
  /** Warmer wood tone for the enclosed office interior (vs. the lighter exterior). */
  floorInside: "#c9b48d",
  groundEdge: "#d8c6a8",
} as const

/** The lone outrun touch: a soft neon cyan for screen glow / small accents. */
export const ACCENT = "#3fd0ff"

/** Floor finishes for the Paint tool (woods, carpets, stone). */
export const FLOOR_SWATCHES = [
  "#e6d7bf",
  "#c9b48d",
  "#a67c52",
  "#7a5a3c",
  "#8c9aa8",
  "#6d7f99",
  "#7f8f6a",
  "#b8a99a",
  "#d8d2c8",
  "#4a4f5c",
] as const

/** Recolour swatches — muted naturals. */
export const SWATCHES = [
  "#efe7db",
  "#c9946a",
  "#d98a63",
  "#6d90c9",
  "#7fa66a",
  "#e8c07a",
  "#b96f6f",
  "#8b7fb0",
  "#5f8a86",
  "#3d4657",
] as const

/**
 * The big neutral surfaces per app theme. Lighting stays bright daylight in both
 * themes (visibility first); dark mode only swaps these to deep slate tones so
 * the office sits naturally inside the dark UI. Furniture keeps its colours.
 * `background: null` → use the time-of-day sky.
 */
export interface SurfacePalette {
  background: string | null
  /**
   * The 2D plan's backdrop: the 3D ground as it actually renders (its floor
   * colour under the scene's midday light, averaged over its gentle shading),
   * so switching between the views keeps the same ground around the building.
   */
  planBackdrop: string
  /**
   * The contour map round the office (see contours.ts): ordinary and index
   * lines, the plateau it stands on — in the plan (flat colour) and in 3D
   * (lit like the ground, so a base colour) — and the plateau's edge.
   */
  contour: { minor: string; major: string; plateau: string; plateau3d: string }
  floor: string
  floorInside: string
  wall: string
  grid: string
  /**
   * How deep night gets: 0 = bright/readable, 1 = deep, >1 darker still (~2.3
   * is near-black). Light surfaces need a deeper night to read as night; dark
   * surfaces already do.
   */
  nightDepth: number
}

// Walls stand apart from the UI around them, so they read as the building,
// not the interface: cool dove grey against the light theme's warm cream
// panels; in the dark theme a light, muted blue-grey — far lighter than its
// slate panels and its dark wood floor.
export const SURFACES: Record<"light" | "dark", SurfacePalette> = {
  light: {
    background: null,
    planBackdrop: "#e5dfd2",
    contour: { minor: "#b9a684", major: "#957d52", plateau: "#ede8de", plateau3d: "#efe4d0" },
    floor: PALETTE.floor,
    floorInside: PALETTE.floorInside,
    wall: "#c9ced8",
    grid: "#9c855e",
    nightDepth: 1.5,
  },
  dark: {
    // Matches the app's dark --background so the scene blends into the UI.
    background: "#151820",
    planBackdrop: "#363941",
    contour: { minor: "#4a5160", major: "#62809f", plateau: "#3e424c", plateau3d: "#363c4a" },
    floor: "#2e3441",
    floorInside: "#4a4135",
    wall: "#8f97a8",
    grid: "#56607a",
    nightDepth: 0,
  },
}
