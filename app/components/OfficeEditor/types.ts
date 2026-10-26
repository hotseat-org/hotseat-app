import { msg } from "~/i18n/msg"

export type ObjectType =
  | "wall"
  | "door"
  | "window"
  | "glassWall"
  | "glassDoor"
  | "desk"
  | "seat"
  | "plant"
  | "workstation"
  | "deskmate"
  | "sofa"
  | "coffeeTable"
  | "meetingTable"
  | "bookshelf"
  | "rug"
  | "cooler"
  | "filingCabinet"
  | "lockers"
  | "printer"
  | "tvScreen"
  | "whiteboard"
  | "vendingMachine"
  | "floorLamp"
  | "trashBin"
  | "kitchenCounter"
  | "fridge"
  | "armchair"
  | "ceilingLight"
  | "wardrobe"
  | "barStool"
  | "barTable"
  | "toilet"
  | "shower"
  | "bathroomSink"
  | "roundTable"
  | "squareTable"
  | "ovalTable"
  | "ovalBarTable"
  | "serverRack"
  | "shelvingUnit"
  | "wallTv"
  | "wallArt"
  | "wallClock"
  | "wallShelf"
  | "coatRack"
  | "planterBox"
  | "divider"
  | "floorPaint"

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

/** The set of build tools (everything that isn't select/delete places an object). */
export const OBJECT_TYPES: ObjectType[] = [
  "wall",
  "door",
  "window",
  "glassWall",
  "glassDoor",
  "desk",
  "seat",
  "plant",
  "workstation",
  "deskmate",
  "sofa",
  "coffeeTable",
  "meetingTable",
  "bookshelf",
  "rug",
  "cooler",
  "filingCabinet",
  "lockers",
  "printer",
  "tvScreen",
  "whiteboard",
  "vendingMachine",
  "floorLamp",
  "trashBin",
  "kitchenCounter",
  "fridge",
  "armchair",
  "ceilingLight",
  "wardrobe",
  "barStool",
  "barTable",
  "toilet",
  "shower",
  "bathroomSink",
  "roundTable",
  "squareTable",
  "ovalTable",
  "ovalBarTable",
  "serverRack",
  "shelvingUnit",
  "wallTv",
  "wallArt",
  "wallClock",
  "wallShelf",
  "coatRack",
  "planterBox",
  "divider",
]

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
export const isMarker = (type: ObjectType) => type === "floorPaint"

/**
 * Desks no longer placed: one without a chair, and one with a pet always in its
 * chair (a pet means someone's booked it). Older layouts still have them.
 */
export const isRetiredDesk = (type: ObjectType) => type === "desk" || type === "deskmate"

/** Desks people sit at — they carry a seat label and an assignee. */
export const isSeatable = (type: ObjectType) =>
  type === "desk" || type === "workstation" || type === "deskmate"

/** Hangs on a wall face: needs solid wall behind it; collides only with other wall items. */
export const isWallMounted = (type: ObjectType) =>
  type === "wallTv" || type === "wallArt" || type === "wallClock" || type === "wallShelf"

/** A piece's look: its stored variant, or a stable one derived from its id. */
export const variantOf = (o: Pick<SceneObject, "id" | "variant">) => {
  if (o.variant !== undefined) return o.variant
  let h = 0
  for (let i = 0; i < o.id.length; i++) h = (h * 31 + o.id.charCodeAt(i)) >>> 0
  return h % 1000
}

/** Pieces that come in several looks (their props, cushions, artwork…). */
const WITH_LOOKS = new Set<ObjectType>([
  "desk",
  "workstation",
  "deskmate",
  "coffeeTable",
  "squareTable",
  "roundTable",
  "meetingTable",
  "ovalTable",
  "barTable",
  "ovalBarTable",
  "sofa",
  "armchair",
  "wallTv",
  "wallArt",
  "wallShelf",
  "coatRack",
  "planterBox",
])
export const hasLooks = (type: ObjectType) => WITH_LOOKS.has(type)

/** Hangs overhead: collides only with other overhead items, never floor furniture or walls. */
export const isOverhead = (type: ObjectType) => type === "ceilingLight"

/** Walls/doors live on grid edges; everything else is furniture. */
export const isEdgeType = (type: ObjectType) =>
  type === "wall" ||
  type === "glassWall" ||
  type === "door" ||
  type === "glassDoor" ||
  type === "window"

/** Plain wall segments (solid or glass) — what an opening is cut into. */
export type WallType = "wall" | "glassWall"
export const isWall = (type?: Tool): type is WallType => type === "wall" || type === "glassWall"

/** Openings cut into a wall: 1 unit wide (two wall half-segments). */
export type OpeningType = "door" | "glassDoor" | "window"
export const isOpening = (type?: Tool): type is OpeningType =>
  type === "door" || type === "glassDoor" || type === "window"

/**
 * An opening cut into a glass wall remembers it (`model: GLASS_HOST`), so
 * filling it back in restores glass, not a solid wall.
 */
export const GLASS_HOST = "glass"

/** Placement grid step (a grid square is GRID × GRID world units). */
export const GRID = 0.5

/** Footprint of each furniture type in grid squares [x, z] (before rotation). */
export const FOOTPRINT_CELLS: Record<ObjectType, [number, number]> = {
  wall: [1, 1],
  door: [1, 1],
  window: [1, 1],
  glassWall: [1, 1],
  glassDoor: [1, 1],
  desk: [4, 2],
  seat: [2, 2],
  plant: [1, 1],
  workstation: [4, 3],
  deskmate: [4, 4],
  sofa: [4, 2],
  coffeeTable: [3, 2],
  meetingTable: [8, 4],
  bookshelf: [3, 1],
  rug: [6, 4],
  cooler: [1, 1],
  filingCabinet: [1, 1],
  lockers: [3, 1],
  printer: [2, 2],
  tvScreen: [3, 1],
  whiteboard: [3, 1],
  vendingMachine: [2, 2],
  floorLamp: [1, 1],
  trashBin: [1, 1],
  kitchenCounter: [4, 2],
  fridge: [2, 2],
  armchair: [2, 2],
  ceilingLight: [2, 2],
  wardrobe: [3, 2],
  barStool: [1, 1],
  barTable: [2, 2],
  toilet: [1, 2],
  shower: [2, 2],
  bathroomSink: [2, 1],
  roundTable: [3, 3],
  squareTable: [2, 2],
  ovalTable: [6, 3],
  ovalBarTable: [4, 2],
  serverRack: [2, 2],
  shelvingUnit: [3, 1],
  wallTv: [3, 1],
  wallArt: [2, 1],
  wallClock: [1, 1],
  wallShelf: [2, 1],
  coatRack: [1, 1],
  planterBox: [4, 1],
  divider: [4, 1],
  floorPaint: [1, 1],
}

/** A grid cell coordinate. */
export interface Cell {
  x: number
  z: number
}

/** A wall segment: a cell plus the orientation it should be built with. */
export interface WallCell extends Cell {
  rotation: number
}
