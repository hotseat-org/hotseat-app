/**
 * The catalogue: every kind of piece the editor knows, and what its logic
 * needs to know about each (rendering is registered apart, see renderers.ts).
 * The editor knows no kinds of its own: presets register them (presets/) —
 * the structure (walls, doors, windows), furniture, and whatever an
 * integrator adds — and extend `ItemKinds`, so `ObjectType` stays a checked
 * union of exactly the registered kinds.
 */

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
  /** People walk through it (a door), or not (a wall, a window). */
  isPassable: boolean
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
export const defineItem = <const T extends Definition>(definition: T) =>
  ({ ...DEFAULTS, ...definition }) as Omit<typeof DEFAULTS, keyof T> & T

/**
 * Every registered kind, by type. Presets extend it with their definitions'
 * types (`declare module`), so a new kind is checked wherever types are.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ItemKinds {}

export type ObjectType = keyof ItemKinds & string

/** The kinds whose edge traits match `T` (e.g. `{ role: "run" }`), as a type. */
type EdgeTypeWith<T> = {
  [K in ObjectType]: ItemKinds[K] extends { edge: T } ? K : never
}[ObjectType]
/** Wall runs (solid or glass) — what an opening is cut into. */
export type WallType = EdgeTypeWith<{ role: "run" }>
/** Openings cut into a wall: 1 unit wide (two wall half-segments). */
export type OpeningType = EdgeTypeWith<{ role: "opening" }>

const definitions = new Map<string, ItemDefinition>()

/** Add kinds to the catalogue (a preset, or an integrator's own). Later ones replace earlier. */
export const registerItems = (items: Record<string, ItemDefinition>) => {
  for (const [type, definition] of Object.entries(items)) definitions.set(type, definition)
}

/** Every registered kind, in the order registered (the catalogue's order). */
export const getItemTypes = () => [...definitions.keys()] as ObjectType[]

export const getItem = (type: ObjectType): ItemDefinition => {
  const definition = definitions.get(type)
  if (!definition) throw new Error(`No item "${type}" in the catalogue`)
  return definition
}

/** The definition of a tool that places a piece; undefined for the others (select, paint…). */
export const findItem = (type: string | undefined): ItemDefinition | undefined =>
  type === undefined ? undefined : definitions.get(type)

/**
 * A piece on the grid's edges: what it does to the layout. Undefined for the
 * rest — and for tools that place no piece (callers often pass the current
 * tool), like every trait question below.
 */
export const getEdge = (type: ObjectType): EdgeTraits | undefined => findItem(type)?.edge

/** Whether an opening of `opening`'s kind can be cut into a run of `run`'s. */
export const canHost = (run: ObjectType, opening: ObjectType) =>
  getEdge(run)?.hosts?.includes(opening) ?? false

export const hasTag = (type: ObjectType, tag: string) => findItem(type)?.tags.includes(tag) ?? false
