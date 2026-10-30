import {
  getItemTypes,
  findItem,
  getItem,
  hasTag,
  type ObjectType,
  type WallType,
  type OpeningType,
} from "./catalog"
import { msg } from "~/i18n/msg"

export type { ObjectType, OpeningType, WallType }

/** Tools that don't place a single object: room (4 walls) and paint. */
export type Tool = "select" | "delete" | "room" | "paint" | ObjectType

/** What a catalog tile can arm: an object type, or the Room tool. */
export type CatalogItem = ObjectType | "room"

/** A single placed item. Positions are in grid units (1 unit = 1 world unit). */
export interface SceneObject {
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
  /** Desks: a seat label, e.g. "D-3". */
  label?: string
  /** Desks: who sits here (the member's email). */
  assignee?: string
  /** Desks: what it offers (DESK_FEATURES ids, e.g. "standing") — set by admins, filtered on. */
  features?: string[]
  /** Desks: the zone (team neighbourhood) it belongs to, by name. */
  zone?: string
  /**
   * Which "look" of the piece to show (its props, cushions…) — so copies don't
   * all look the same. Unset → derived from the id (see `variantOf`).
   */
  variant?: number
}

/**
 * What a desk can offer, for admins to tag and people to filter the map by.
 * Add one here and it shows up in the editor and the filters.
 */
export const DESK_FEATURES = [
  { id: "standing", label: msg("Standing desk"), labelPlural: msg("Standing desks") },
] as const
export type DeskFeature = (typeof DESK_FEATURES)[number]["id"]

/** The set of build tools: every kind of piece but data markers. */
export const OBJECT_TYPES = getItemTypes().filter((type) => getItem(type).mount !== "marker")

export const isObjectType = (tool: Tool): tool is ObjectType =>
  (OBJECT_TYPES as string[]).includes(tool)

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

/**
 * Desks no longer placed: one without a chair, and one with a pet always in its
 * chair (a pet means someone's booked it). Older layouts still have them.
 */
export const isRetiredDesk = (type: ObjectType) => hasTag(type, "retiredDesk")

/** Desks people sit at — they carry a seat label and an assignee. */
export const isSeatable = (type: ObjectType) => hasTag(type, "desk")

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
