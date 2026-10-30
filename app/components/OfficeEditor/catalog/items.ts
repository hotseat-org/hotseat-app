import { PALETTE } from "../palette"

/**
 * Where a piece lives: on the floor, hung on a wall face, overhead, on the
 * grid's edges (walls and what's cut into them), or nowhere — a data marker
 * that never renders, collides or gets selected.
 */
export type Mount = "floor" | "wall" | "ceiling" | "edge" | "marker"

/** What an edge piece (on the grid's edges) does to the layout. */
export interface EdgeTraits {
  /** A run of segments (a wall), or an opening cut into one (a door, a window). */
  role: "run" | "opening"
  /** Closes rooms: room detection, zones and the floor stop at it. */
  encloses: boolean
  /** Seen through (glass): no paint, no window in it, its own look at joints. */
  isSeeThrough: boolean
  /** The Paint tool paints it, face by face. */
  isPaintable: boolean
  /** A run: the openings that can be cut into it. */
  hosts?: readonly string[]
}

/** A kind of piece: everything the editor's logic needs to know about it (rendering is registered apart). */
export interface ItemDefinition {
  mount: Mount
  /** Footprint in grid squares [x, z], before turning. */
  footprint: readonly [number, number]
  /** Its colour unless painted. */
  defaultColor: string
  /** Takes a colour of its own (doors are always wood). */
  isRecolorable: boolean
  /** Comes in several looks (props, cushions, artwork…) — see `variantOf`. */
  hasLooks: boolean
  /** Floor décor that other furniture may stand on (a rug). */
  isUnderlay: boolean
  edge?: EdgeTraits
  /** What integrators mark it as — the office module's "desk", for one. */
  tags: readonly string[]
}

type Definition = Partial<ItemDefinition> & Pick<ItemDefinition, "footprint" | "defaultColor">

const DEFAULTS = {
  mount: "floor",
  isRecolorable: true,
  hasLooks: false,
  isUnderlay: false,
  tags: [],
} as const

/** A definition with the defaults filled in, keeping its literal types (for WallType…). */
const define = <const T extends Definition>(d: T) =>
  ({ ...DEFAULTS, ...d }) as Omit<typeof DEFAULTS, keyof T> & T

const OPENINGS = ["door", "glassDoor", "window"] as const

/** Every kind of piece, in catalogue order. */
export const ITEMS = {
  wall: define({
    mount: "edge",
    footprint: [1, 1],
    defaultColor: PALETTE.wall,
    edge: { role: "run", encloses: true, isSeeThrough: false, isPaintable: true, hosts: OPENINGS },
  }),
  door: define({
    mount: "edge",
    footprint: [1, 1],
    defaultColor: PALETTE.doorLeaf,
    isRecolorable: false,
    edge: { role: "opening", encloses: true, isSeeThrough: false, isPaintable: false },
  }),
  window: define({
    mount: "edge",
    footprint: [1, 1],
    defaultColor: "#f4efe6",
    edge: { role: "opening", encloses: true, isSeeThrough: false, isPaintable: true },
  }),
  glassWall: define({
    mount: "edge",
    footprint: [1, 1],
    defaultColor: "#5b6577",
    edge: {
      role: "run",
      encloses: true,
      isSeeThrough: true,
      isPaintable: false,
      hosts: ["door", "glassDoor"],
    },
  }),
  glassDoor: define({
    mount: "edge",
    footprint: [1, 1],
    defaultColor: "#5b6577",
    edge: { role: "opening", encloses: true, isSeeThrough: false, isPaintable: false },
  }),
  desk: define({
    footprint: [4, 2],
    defaultColor: PALETTE.deskTop,
    hasLooks: true,
    tags: ["desk", "retiredDesk"],
  }),
  seat: define({ footprint: [2, 2], defaultColor: PALETTE.seat }),
  plant: define({ footprint: [1, 1], defaultColor: PALETTE.plantLeaf }),
  workstation: define({
    footprint: [4, 3],
    defaultColor: PALETTE.deskTop,
    hasLooks: true,
    tags: ["desk"],
  }),
  deskmate: define({
    footprint: [4, 4],
    defaultColor: PALETTE.deskTop,
    hasLooks: true,
    tags: ["desk", "retiredDesk"],
  }),
  sofa: define({ footprint: [4, 2], defaultColor: "#5f8a86", hasLooks: true }),
  coffeeTable: define({ footprint: [3, 2], defaultColor: PALETTE.deskTop, hasLooks: true }),
  meetingTable: define({ footprint: [8, 4], defaultColor: PALETTE.deskTop, hasLooks: true }),
  bookshelf: define({ footprint: [3, 1], defaultColor: PALETTE.deskLeg }),
  rug: define({ footprint: [6, 4], defaultColor: "#b96f6f", isUnderlay: true }),
  cooler: define({ footprint: [1, 1], defaultColor: "#e8edf2" }),
  filingCabinet: define({ footprint: [1, 1], defaultColor: "#8f9aa6" }),
  lockers: define({ footprint: [3, 1], defaultColor: "#5f7d9a" }),
  printer: define({ footprint: [2, 2], defaultColor: "#e8edf2" }),
  tvScreen: define({ footprint: [3, 1], defaultColor: PALETTE.deskLeg }),
  whiteboard: define({ footprint: [3, 1], defaultColor: "#b9bcc4" }),
  vendingMachine: define({ footprint: [2, 2], defaultColor: "#c9564f" }),
  floorLamp: define({ footprint: [1, 1], defaultColor: "#f0e2c0" }),
  trashBin: define({ footprint: [1, 1], defaultColor: "#5b6577" }),
  kitchenCounter: define({ footprint: [4, 2], defaultColor: "#d9cbb4" }),
  fridge: define({ footprint: [2, 2], defaultColor: "#e8edf2" }),
  armchair: define({ footprint: [2, 2], defaultColor: "#c0876a", hasLooks: true }),
  ceilingLight: define({ mount: "ceiling", footprint: [2, 2], defaultColor: "#3d4657" }),
  wardrobe: define({ footprint: [3, 2], defaultColor: "#c9a27e" }),
  barStool: define({ footprint: [1, 1], defaultColor: "#d98a63" }),
  barTable: define({ footprint: [2, 2], defaultColor: PALETTE.deskTop, hasLooks: true }),
  toilet: define({ footprint: [1, 2], defaultColor: "#f3f1ec" }),
  shower: define({ footprint: [2, 2], defaultColor: "#9fc3c9" }),
  bathroomSink: define({ footprint: [2, 1], defaultColor: "#6d7f99" }),
  roundTable: define({ footprint: [3, 3], defaultColor: PALETTE.deskTop, hasLooks: true }),
  squareTable: define({ footprint: [2, 2], defaultColor: PALETTE.deskTop, hasLooks: true }),
  ovalTable: define({ footprint: [6, 3], defaultColor: PALETTE.deskTop, hasLooks: true }),
  ovalBarTable: define({ footprint: [4, 2], defaultColor: PALETTE.deskTop, hasLooks: true }),
  serverRack: define({ footprint: [2, 2], defaultColor: "#2c313c" }),
  shelvingUnit: define({ footprint: [3, 1], defaultColor: "#e9e1d4" }),
  wallTv: define({ mount: "wall", footprint: [3, 1], defaultColor: "#2c313c", hasLooks: true }),
  wallArt: define({ mount: "wall", footprint: [2, 1], defaultColor: "#c9946a", hasLooks: true }),
  wallClock: define({ mount: "wall", footprint: [1, 1], defaultColor: "#3d4657" }),
  wallShelf: define({
    mount: "wall",
    footprint: [2, 1],
    defaultColor: PALETTE.deskTop,
    hasLooks: true,
  }),
  coatRack: define({ footprint: [1, 1], defaultColor: PALETTE.deskLeg, hasLooks: true }),
  planterBox: define({ footprint: [4, 1], defaultColor: "#8f9aa6", hasLooks: true }),
  divider: define({ footprint: [4, 1], defaultColor: "#5f8a86" }),
  /**
   * A floor paint sits at a spot and colours the ROOM containing it (so it
   * survives walls being edited).
   */
  floorPaint: define({ mount: "marker", footprint: [1, 1], defaultColor: "#c9b48d" }),
}

export type ObjectType = keyof typeof ITEMS

/** The kinds whose edge traits match `T` (e.g. `{ role: "run" }`), as a type. */
type EdgeTypeWith<T> = {
  [K in ObjectType]: (typeof ITEMS)[K] extends { edge: T } ? K : never
}[ObjectType]
/** Wall runs (solid or glass) — what an opening is cut into. */
export type WallType = EdgeTypeWith<{ role: "run" }>
/** Openings cut into a wall: 1 unit wide (two wall half-segments). */
export type OpeningType = EdgeTypeWith<{ role: "opening" }>

export const getItem = (type: ObjectType): ItemDefinition => ITEMS[type]

/** The definition of a tool that places a piece; undefined for the others (select, paint…). */
export const findItem = (type: string | undefined): ItemDefinition | undefined =>
  type !== undefined && Object.prototype.hasOwnProperty.call(ITEMS, type)
    ? getItem(type as ObjectType)
    : undefined

export const hasTag = (type: ObjectType, tag: string) => getItem(type).tags.includes(tag)
