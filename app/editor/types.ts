import { findItem, type ObjectType, type WallType, type OpeningType } from "./catalog"

export type { ObjectType, OpeningType, WallType }

/** Tools that don't place a single object: room (4 walls) and paint. */
export type Tool = "select" | "delete" | "room" | "paint" | ObjectType

/** What a catalog tile can arm: an object type, or the Room tool. */
export type CatalogItem = ObjectType | "room"

/**
 * Fields a module keeps on placed pieces, beyond the editor's own: modules
 * add theirs (`declare module`) — the office's desk label, resident, zone…
 * (see office/slots/objectFields.ts). They're saved with the layout as they are.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ObjectFields {}

/** A single placed item. Positions are in grid units (1 unit = 1 world unit). */
export interface SceneObject extends ObjectFields {
  id: string
  type: ObjectType
  /** World X, snapped to the grid. */
  x: number
  /** World Z, snapped to the grid. */
  z: number
  /** Y-rotation in radians, always a multiple of Math.PI / 2. */
  rotation: number
  /** Optional palette override; falls back to the type's default colour. */
  color?: string
  /**
   * Walls: one face painted apart from the other — its front (its +Z side as
   * built) and back. Either set, these give the faces instead of `color`
   * (see getWallFaces).
   */
  colorFront?: string
  colorBack?: string
  /** For deskmate: which animal model sits on the chair. */
  model?: string
  /**
   * Which "look" of the piece to show (its props, cushions…) — so copies don't
   * all look the same. Unset → derived from the id (see `variantOf`).
   */
  variant?: number
}

/** A tool that places a piece (a registered item, not a data marker). */
export const isObjectType = (tool: Tool): tool is ObjectType => {
  const item = findItem(tool)

  return !!item && item.mount !== "marker"
}

/** Size of one grid cell in world units. */
export const CELL = 1

/**
 * Half-size of the buildable floor (world units, centred on the origin). The
 * canvas is endless in practice: this only keeps placement within sane numbers.
 */
export const BUILD_HALF = 1000

/**
 * An invisible data marker, not an object: a floor paint sits at a spot and
 * colours the ROOM containing it (so it survives walls being edited). Markers
 * never render, collide, get selected or framed.
 */
export const isMarker = (type: ObjectType) => findItem(type)?.mount === "marker"

/** Hangs on a wall face: needs solid wall behind it; collides only with other wall items. */
export const isWallMounted = (type: ObjectType) => findItem(type)?.mount === "wall"

/** A piece's look: its stored variant, or a stable one derived from its id. */
export const variantOf = (object: Pick<SceneObject, "id" | "variant">) => {
  if (object.variant !== undefined) return object.variant

  let hash = 0
  for (let i = 0; i < object.id.length; i++) hash = (hash * 31 + object.id.charCodeAt(i)) >>> 0

  return hash % 1000
}

/** Pieces that come in several looks (their props, cushions, artwork…). */
export const hasLooks = (type: ObjectType) => findItem(type)?.hasLooks === true

/** Hangs overhead: collides only with other overhead items, never floor furniture or walls. */
export const isOverhead = (type: ObjectType) => findItem(type)?.mount === "ceiling"

/** Walls/doors live on grid edges; everything else is furniture. */
export const isEdgeType = (type: ObjectType) => findItem(type)?.mount === "edge"

/** Wall runs (solid or glass) — what an opening is cut into. */
export const isWall = (type?: Tool): type is WallType => findItem(type)?.edge?.role === "run"

/** Whether a piece takes a colour of its own: all but doors, which are always wood. */
export const isRecolorable = (type: Tool) => findItem(type)?.isRecolorable !== false

/** Openings cut into a wall: 1 unit wide (two wall half-segments). */
export const isOpening = (type?: Tool): type is OpeningType =>
  findItem(type)?.edge?.role === "opening"

/**
 * An opening cut into a glass wall remembers it (`model: GLASS_HOST`), so
 * filling it back in restores glass, not a solid wall.
 */
export const GLASS_HOST = "glass"

/** Placement grid step (a grid square is GRID × GRID world units). */
export const GRID = 0.5

/** A grid cell coordinate. */
export interface Cell {
  x: number
  z: number
}

/** A wall segment: a cell plus the orientation it should be built with. */
export interface WallCell extends Cell {
  rotation: number
}
