import {
  GRID,
  isEdgeType,
  isMarker,
  isOverhead,
  isWallMounted,
  type ObjectType,
  type SceneObject,
  type WallCell,
} from "../types"
import { getItem } from "../catalog/items"
import { edgeLength, edgeStep, isDiagonalEdge, runsAlongX } from "./edges"
import { mountWalls } from "./mounts"
import { clampToFloor, footprintCells } from "./placement"
import { isDiagonal } from "./rotation"

/** A footprint: centre, half sizes along its own axes, and how far it's turned off the grid's. */
interface Rect {
  x: number
  z: number
  hx: number
  hz: number
  /** 0 for a piece on the grid's axes (hx/hz already swapped for a quarter turn). */
  angle: number
}

/** A rectangle's own axes in the world (a piece's local X and Z, turned). */
const axesOf = (r: Rect): [[number, number], [number, number]] => {
  const c = Math.cos(r.angle)
  const s = Math.sin(r.angle)
  return [
    [c, -s],
    [s, c],
  ]
}

/** How far a rectangle reaches along a direction from its centre. */
const reachAlong = (r: Rect, [nx, nz]: [number, number]) => {
  const [u, v] = axesOf(r)
  return r.hx * Math.abs(u[0] * nx + u[1] * nz) + r.hz * Math.abs(v[0] * nx + v[1] * nz)
}

/** Overlaps must be deeper than this to count: pieces may touch, flush. */
const TOUCH = 1e-6

/**
 * Whether two footprints overlap (touching doesn't count). Axis-aligned pairs
 * compare boxes; a turned one is tested along each rectangle's axes — two
 * rectangles are apart exactly when they're apart along one of those.
 */
const rectsOverlap = (a: Rect, b: Rect) => {
  if (a.angle === 0 && b.angle === 0)
    return Math.abs(b.x - a.x) < a.hx + b.hx && Math.abs(b.z - a.z) < a.hz + b.hz
  const dx = b.x - a.x
  const dz = b.z - a.z
  return [...axesOf(a), ...axesOf(b)].every(
    (n) => Math.abs(dx * n[0] + dz * n[1]) < reachAlong(a, n) + reachAlong(b, n) - TOUCH
  )
}

const footprintRect = (type: ObjectType, rotation: number, x: number, z: number): Rect => {
  if (isDiagonal(rotation)) {
    const [wx, wz] = getItem(type).footprint
    return { x, z, hx: (wx * GRID) / 2, hz: (wz * GRID) / 2, angle: rotation }
  }
  const [cx, cz] = footprintCells(type, rotation)
  return { x, z, hx: (cx * GRID) / 2, hz: (cz * GRID) / 2, angle: 0 }
}

/** Whether a piece's footprint (turned as it is) overlaps the grid square centred at (x, z). */
export const footprintOverlapsSquare = (o: SceneObject, x: number, z: number) =>
  rectsOverlap(footprintRect(o.type, o.rotation, o.x, o.z), {
    x,
    z,
    hx: GRID / 2,
    hz: GRID / 2,
    angle: 0,
  })

/**
 * Whether a wall/door edge cuts through a footprint's interior. The wall is
 * treated as its centre line, and comparisons are strict — so furniture may
 * stand flush against a wall (touching it), but never straddle one.
 */
const edgeCrossesRect = (
  e: { x: number; z: number; rotation: number; type?: ObjectType },
  r: Rect
) => {
  const h = edgeLength(e) / 2
  if (r.angle !== 0 || isDiagonalEdge(e.rotation)) {
    // A turned footprint, or a diagonal wall: the wall as a line (no
    // thickness), tested along its direction, across it, and the footprint's
    // own axes.
    const [sx, sz] = edgeStep(e.rotation)
    const length = Math.hypot(sx, sz)
    const along: [number, number] = [sx / length, sz / length]
    const across: [number, number] = [-along[1], along[0]]
    const dx = r.x - e.x
    const dz = r.z - e.z
    return [along, across, ...axesOf(r)].every(
      (n) =>
        Math.abs(dx * n[0] + dz * n[1]) <
        h * Math.abs(along[0] * n[0] + along[1] * n[1]) + reachAlong(r, n) - TOUCH
    )
  }
  return runsAlongX(e.rotation)
    ? r.z - r.hz < e.z && e.z < r.z + r.hz && r.x - r.hx < e.x + h && e.x - h < r.x + r.hx
    : r.x - r.hx < e.x && e.x < r.x + r.hx && r.z - r.hz < e.z + h && e.z - h < r.z + r.hz
}

/** Which collision layer a piece lives in: the floor, the ceiling or a wall face. */
const layerOf = (type: ObjectType) =>
  isOverhead(type) ? "overhead" : isWallMounted(type) ? "wall" : "floor"

/**
 * Whether furniture of `type` at (x,z) would collide: overlapping other
 * furniture (grid-aligned footprints, so edge-to-edge is fine) or crossing a
 * wall/door. Rugs are floor décor — they may go under furniture, but not
 * through walls. Overhead items (ceiling lights) ignore everything on the
 * floor and walls, colliding only with each other. `ignoreId` skips the object being moved.
 */
export const furnitureCollides = (
  objects: SceneObject[],
  type: ObjectType,
  x: number,
  z: number,
  rotation: number,
  ignoreId?: string
): boolean => {
  if (isMarker(type)) return false
  // Wall items need solid wall behind their whole width.
  if (isWallMounted(type) && !mountWalls(objects, type, x, z, rotation)) return true
  const a = footprintRect(type, rotation, x, z)
  for (const o of objects) {
    if (o.id === ignoreId || isMarker(o.type)) continue
    if (isEdgeType(o.type)) {
      if (!isOverhead(type) && edgeCrossesRect(o, a)) return true
      continue
    }
    // Overhead items (ceiling lights) and wall items only bump into their own kind.
    if (layerOf(type) !== layerOf(o.type)) continue
    if (type === "rug" || o.type === "rug") continue
    if (rectsOverlap(a, footprintRect(o.type, o.rotation, o.x, o.z))) return true
  }
  return false
}

/**
 * Whether moving a GROUP of furniture to new positions would collide — with
 * anything not in the group, or with each other — or leave the floor.
 */
export const groupCollides = (objects: SceneObject[], moved: SceneObject[]): boolean => {
  const ids = new Set(moved.map((m) => m.id))
  const others = objects.filter((o) => !ids.has(o.id))
  return moved.some((m) => {
    const p = clampToFloor(m.type, m.rotation, { x: m.x, z: m.z })
    if (p.x !== m.x || p.z !== m.z) return true
    const rest = [...others, ...moved.filter((o) => o.id !== m.id)]
    return furnitureCollides(rest, m.type, m.x, m.z, m.rotation)
  })
}

/** Whether a wall/door edge would cut through any placed furniture (rugs included). */
export const edgeBlocked = (objects: SceneObject[], e: WallCell): boolean =>
  objects.some(
    (o) =>
      !isEdgeType(o.type) &&
      !isOverhead(o.type) &&
      !isMarker(o.type) &&
      edgeCrossesRect(e, footprintRect(o.type, o.rotation, o.x, o.z))
  )
