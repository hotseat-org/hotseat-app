import { FOOTPRINT_CELLS, GRID, type ObjectType, type SceneObject } from "../types"
import { SEG, edgeStep, isDiagonalEdge, nearestEdgeId, runsAlongX } from "./edges"
import { snapAxis } from "./placement"

/** Unit vector a piece faces (its +Z) at a rotation. */
const facing = (rotation: number) => ({ x: Math.sin(rotation), z: Math.cos(rotation) })

/** How near (m) a point must be to a wall's centre line to be on it. */
const ON_LINE = 0.02

/** The plain solid wall segment a point on a wall's line falls on, if any. */
const solidWallAt = (walls: SceneObject[], px: number, pz: number) =>
  walls.find((o) => {
    const [sx, sz] = edgeStep(o.rotation)
    const length = Math.hypot(sx, sz)
    const along = ((px - o.x) * sx + (pz - o.z) * sz) / length
    const across = ((px - o.x) * -sz + (pz - o.z) * sx) / length
    return Math.abs(across) <= ON_LINE && Math.abs(along) <= length / 2 + 1e-6
  })

/**
 * The solid wall segments behind a wall item's back edge (its −Z side), or
 * null unless its whole width is backed by plain solid wall (not glass, a
 * door or a window) — on a straight wall or a diagonal one. Also used to cut a
 * wall item away with its wall.
 */
export const mountWalls = (
  objects: SceneObject[],
  type: ObjectType,
  x: number,
  z: number,
  rotation: number
): string[] | null => {
  const [w, d] = FOOTPRINT_CELLS[type]
  const f = facing(rotation)
  // Back-edge centre, and the direction along it (the piece's local X).
  const bx = x - (f.x * d * GRID) / 2
  const bz = z - (f.z * d * GRID) / 2
  const along = { x: f.z, z: -f.x }
  const walls = objects.filter((o) => o.type === "wall")
  const ids = new Set<string>()
  // Points along the back edge, a grid step apart, each on solid wall.
  for (let i = 0; i < w; i++) {
    const off = (i - (w - 1) / 2) * SEG
    const wall = solidWallAt(walls, bx + along.x * off, bz + along.z * off)
    if (!wall) return null
    ids.add(wall.id)
  }
  return [...ids]
}

/**
 * Where a wall item goes for a cursor at (px, pz): against the face of the
 * nearest solid wall (within reach), facing the cursor's side, slid along the
 * wall to the cursor. Null when no wall is near.
 */
export const wallMount = (
  objects: SceneObject[],
  type: ObjectType,
  px: number,
  pz: number
): { x: number; z: number; rotation: number } | null => {
  const id = nearestEdgeId(objects, px, pz, 0.8, (o) => o.type === "wall")
  const wall = id && objects.find((o) => o.id === id)
  if (!wall) return null
  const [w, d] = FOOTPRINT_CELLS[type]
  const depth = (d * GRID) / 2
  if (isDiagonalEdge(wall.rotation)) {
    // Along the diagonal's line in half-segment steps, out from its face.
    const [sx, sz] = edgeStep(wall.rotation)
    const length = Math.hypot(sx, sz)
    const u = { x: sx / length, z: sz / length }
    const n = { x: -u.z, z: u.x }
    const side = (px - wall.x) * n.x + (pz - wall.z) * n.z >= 0 ? 1 : -1
    const step = length / 2
    const t = Math.round(((px - wall.x) * u.x + (pz - wall.z) * u.z) / step) * step
    return {
      x: wall.x + u.x * t + n.x * side * depth,
      z: wall.z + u.z * t + n.z * side * depth,
      // Facing (sin r, cos r) = out from the wall.
      rotation: Math.atan2(n.x * side, n.z * side),
    }
  }
  if (runsAlongX(wall.rotation)) {
    const side = pz >= wall.z ? 1 : -1
    return { x: snapAxis(px, w), z: wall.z + side * depth, rotation: side > 0 ? 0 : Math.PI }
  }
  const side = px >= wall.x ? 1 : -1
  return {
    x: wall.x + side * depth,
    z: snapAxis(pz, w),
    rotation: side > 0 ? Math.PI / 2 : (Math.PI * 3) / 2,
  }
}
