import { nanoid } from "nanoid"
import { createContext, useContext, useSyncExternalStore } from "react"
import {
  SEG,
  edgeBlocked,
  edgeDirection,
  enclosedRegions,
  furnitureCollides,
  furnitureInRoomAt,
  unitEdges,
  type FloorCell,
} from "./layout"
import { isEdgeType, isMarker, type SceneObject } from "./types"

/**
 * A saved room — its walls, doors and windows and what stands in it — to place
 * again, whole, anywhere (a meeting room, a phone booth, a kitchen). A real
 * office keeps them for its organization (see KitLibraryContext); the
 * standalone editor, in this browser.
 */
export interface Kit {
  id: string
  name: string
  /** Positions relative to the kit's middle (whole grid steps from it). */
  objects: SceneObject[]
  /** Floor area (m²). */
  area: number
}

const STORAGE_KEY = "office-editor:kits"
const NO_KITS: Kit[] = []
let cache: Kit[] | null = null
const listeners = new Set<() => void>()

const readKits = (): Kit[] => {
  if (cache) return cache
  try {
    cache = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as Kit[]
  } catch {
    cache = []
  }
  return cache
}

const writeKits = (kits: Kit[]) => {
  cache = kits
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(kits))
  } catch {
    // Storage full or blocked: kept for this visit only.
  }
  listeners.forEach((listener) => listener())
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Where saved rooms are kept and changed. */
export interface KitLibrary {
  /** Newest first. */
  kits: Kit[]
  addKit: (kit: Kit) => void
  deleteKit: (id: string) => void
}

/** A real office's library (its organization's, in the database). */
export const KitLibraryContext = createContext<KitLibrary | null>(null)

const addLocalKit = (kit: Kit) => writeKits([kit, ...readKits()])
const deleteLocalKit = (id: string) => writeKits(readKits().filter((k) => k.id !== id))

/** The saved rooms: the office's organization's, or (standalone) this browser's. */
export const useKitLibrary = (): KitLibrary => {
  const library = useContext(KitLibraryContext)
  const localKits = useSyncExternalStore(subscribe, readKits, () => NO_KITS)
  return library ?? { kits: localKits, addKit: addLocalKit, deleteKit: deleteLocalKit }
}

const cellKey = (x: number, z: number) =>
  `${Math.floor(x / SEG) * SEG},${Math.floor(z / SEG) * SEG}`

/** Whether a wall/door edge borders (or, diagonally, crosses) one of the room's squares. */
const bordersRoom = (o: SceneObject, cells: Set<string>) =>
  unitEdges(o).some((e) => {
    const direction = edgeDirection(e.rotation)
    if (direction === "x")
      return cells.has(cellKey(e.x, e.z - SEG / 2)) || cells.has(cellKey(e.x, e.z + SEG / 2))
    if (direction === "z")
      return cells.has(cellKey(e.x - SEG / 2, e.z)) || cells.has(cellKey(e.x + SEG / 2, e.z))
    return cells.has(cellKey(e.x, e.z))
  })

const areaOf = (room: FloorCell[]) =>
  room.reduce((sum, c) => {
    if (c.parts === undefined) return sum + 1
    let n = 0
    for (let bits = c.parts; bits; bits >>= 1) n += bits & 1
    return sum + n / 4
  }, 0) *
  SEG *
  SEG

/** The room containing a floor point, as a kit (unnamed); null outside rooms. */
export const composeKit = (
  objects: SceneObject[],
  x: number,
  z: number
): Omit<Kit, "name"> | null => {
  const room = enclosedRegions(objects).find((r) =>
    r.some((c) => cellKey(x, z) === `${c.x},${c.z}`)
  )
  if (!room) return null
  const cells = new Set(room.map((c) => `${c.x},${c.z}`))
  const inside = new Set(furnitureInRoomAt(objects, x, z))
  const picked = objects.filter((o) =>
    isEdgeType(o.type) ? bordersRoom(o, cells) : inside.has(o.id) && !isMarker(o.type)
  )
  // Centred on the room, by whole grid steps, so everything stays on the grid.
  const xs = room.map((c) => c.x)
  const zs = room.map((c) => c.z)
  const cx = Math.round((Math.min(...xs) + Math.max(...xs) + SEG) / 2 / SEG) * SEG
  const cz = Math.round((Math.min(...zs) + Math.max(...zs) + SEG) / 2 / SEG) * SEG
  return {
    id: nanoid(8),
    area: areaOf(room),
    objects: picked.map(({ id, type, x: ox, z: oz, rotation, color, variant, features }) => ({
      id,
      type,
      x: ox - cx,
      z: oz - cz,
      rotation,
      color,
      variant,
      features,
    })),
  }
}

/** A kit's pieces where it'd land, with the cursor at (x, z) — fresh ids. */
export const composeKitAt = (kit: Kit, x: number, z: number): SceneObject[] => {
  const dx = Math.round(x / SEG) * SEG
  const dz = Math.round(z / SEG) * SEG
  return kit.objects.map((o) => ({ ...o, id: nanoid(8), x: o.x + dx, z: o.z + dz }))
}

/**
 * Whether a kit can go there: its walls may meet or share the office's, but
 * nothing may cut through furniture, and its furniture may not collide.
 */
export const canPlaceKit = (objects: SceneObject[], placed: SceneObject[]) => {
  const edges = placed.filter((o) => isEdgeType(o.type))
  if (edges.flatMap(unitEdges).some((e) => edgeBlocked(objects, e))) return false
  const withEdges = [...objects, ...edges]
  return placed
    .filter((o) => !isEdgeType(o.type))
    .every((o) => !furnitureCollides(withEdges, o.type, o.x, o.z, o.rotation))
}
