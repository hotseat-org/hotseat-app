import {
  GLASS_HOST,
  GRID,
  isEdgeType,
  isOpening,
  type Cell,
  type ObjectType,
  type SceneObject,
  type WallCell,
} from "../types"
import { getEdge } from "../catalog/items"

/**
 * Which way a wall/door edge runs: along X, along Z, or across a grid square
 * corner to corner — "rising" (x and z grow together) or "falling" (z drops as
 * x grows). A piece runs along its local X, turned by its rotation.
 */
export type EdgeDirection = "x" | "z" | "rising" | "falling"

export const edgeDirection = (rotation: number): EdgeDirection => {
  const eighths = Math.round((((rotation % Math.PI) + Math.PI) % Math.PI) / (Math.PI / 4)) % 4
  return eighths === 0 ? "x" : eighths === 1 ? "falling" : eighths === 2 ? "z" : "rising"
}

/** The rotation a wall/door is built with to run each way. */
export const EDGE_ROTATION: Record<EdgeDirection, number> = {
  x: 0,
  falling: Math.PI / 4,
  z: Math.PI / 2,
  rising: (3 * Math.PI) / 4,
}

/** True when a wall/door segment runs along X (not along Z, nor diagonally). */
export const runsAlongX = (rotation: number) => edgeDirection(rotation) === "x"

/** Runs corner to corner across grid squares. */
export const isDiagonalEdge = (rotation: number) => {
  const direction = edgeDirection(rotation)
  return direction === "rising" || direction === "falling"
}

/** From one grid node to the next along an edge's direction (x grows; for Z, z grows). */
export const edgeStep = (rotation: number): [number, number] => {
  switch (edgeDirection(rotation)) {
    case "x":
      return [SEG, 0]
    case "z":
      return [0, SEG]
    case "rising":
      return [SEG, SEG]
    case "falling":
      return [SEG, -SEG]
  }
}

/**
 * Wall segment length: walls live on the same 0.5 grid as furniture, so one
 * segment spans exactly one grid square. A door spans two segments (1 unit —
 * narrower would read as a slit).
 */
export const SEG = GRID
const DOOR_SEGS = 2

/**
 * How much a single wall/door/window model is stretched along its run: the
 * models are made for a straight edge; a diagonal one is √2 longer.
 */
export const edgeStretch = (type: ObjectType, rotation: number): [number, number, number] =>
  isEdgeType(type) && isDiagonalEdge(rotation) ? [Math.SQRT2, 1, 1] : [1, 1, 1]

/** Length (world units) of a wall/door edge: a unit edge is SEG, or SEG·√2 diagonally. */
export const edgeLength = (o: { type?: ObjectType; rotation?: number }) =>
  (isOpening(o.type) ? DOOR_SEGS : 1) *
  (o.rotation !== undefined && isDiagonalEdge(o.rotation) ? SEG * Math.SQRT2 : SEG)

/**
 * The unit (SEG-long) edges an edge object covers: a wall is one, a door two.
 * Everything that reasons about "which edges are taken/blocked" uses these.
 */
export const unitEdges = (o: SceneObject): WallCell[] => {
  if (!isOpening(o.type)) return [{ x: o.x, z: o.z, rotation: o.rotation }]
  const [sx, sz] = edgeStep(o.rotation)
  return [-0.5, 0.5].map((k) => ({ x: o.x + k * sx, z: o.z + k * sz, rotation: o.rotation }))
}

/** Stable key of a unit edge (position + direction). */
export const edgeKey = (e: WallCell) => `${e.x},${e.z},${edgeDirection(e.rotation)}`

/**
 * Upgrade layouts saved with the old 1-unit wall segments: each becomes two
 * half segments. Old wall centres sit on multiples of 0.5 along their run; new
 * ones on odd quarters (x.25 / x.75), so detection is exact and this is
 * idempotent. Doors kept their 1-unit size, so they need no change.
 */
export const normalizeEdges = (objects: SceneObject[]): SceneObject[] => {
  if (!objects.some((o) => o.type === "wall" && isLegacyWall(o))) return objects
  return objects.flatMap((o) => {
    if (o.type !== "wall" || !isLegacyWall(o)) return [o]
    const d = SEG / 2
    const alongX = runsAlongX(o.rotation)
    return [-d, d].map((off, i) => ({
      ...o,
      id: `${o.id}${i ? "b" : "a"}`,
      x: alongX ? o.x + off : o.x,
      z: alongX ? o.z : o.z + off,
    }))
  })
}
const isLegacyWall = (o: SceneObject) => {
  if (isDiagonalEdge(o.rotation)) return false // diagonals came later
  const along = runsAlongX(o.rotation) ? o.x : o.z
  return Math.round(along * 4) % 2 === 0
}

/** A glass partition, or an opening cut into one. */
export const isGlassEdge = (o: SceneObject) =>
  !!getEdge(o.type)?.isSeeThrough || o.model === GLASS_HOST

/** A solid wall run: what windows show the paint of, and what wall items hang on. */
export const isSolidWall = (o: SceneObject) => {
  const edge = getEdge(o.type)
  return edge?.role === "run" && !edge.isSeeThrough
}

/** The two grid nodes at the ends of a wall/door edge. */
export const edgeNodes = (o: SceneObject): [Cell, Cell] => {
  const [sx, sz] = edgeStep(o.rotation)
  const k = (isOpening(o.type) ? DOOR_SEGS : 1) / 2
  return [
    { x: o.x - k * sx, z: o.z - k * sz },
    { x: o.x + k * sx, z: o.z + k * sz },
  ]
}

/** Shortest distance from a point to a line segment. */
const distToSegment = (px: number, pz: number, ax: number, az: number, bx: number, bz: number) => {
  const dx = bx - ax
  const dz = bz - az
  const lenSq = dx * dx + dz * dz || 1
  let t = ((px - ax) * dx + (pz - az) * dz) / lenSq
  t = Math.max(0, Math.min(1, t))
  const cx = ax + t * dx
  const cz = az + t * dz
  return Math.hypot(px - cx, pz - cz)
}

/** Id of the wall/door segment nearest a point, within `maxDist`, else null. */
export const nearestEdgeId = (
  objects: SceneObject[],
  px: number,
  pz: number,
  maxDist = 0.45,
  accept: (o: SceneObject) => boolean = (o) => isEdgeType(o.type)
): string | null => {
  let best: string | null = null
  let bestD = maxDist
  for (const o of objects) {
    if (!accept(o)) continue
    const [a, b] = edgeNodes(o)
    const d = distToSegment(px, pz, a.x, a.z, b.x, b.z)
    if (d < bestD) {
      bestD = d
      best = o.id
    }
  }
  return best
}

/**
 * Nodes where a corner post is needed — i.e. where wall/door edges running
 * different ways meet (corners, T- and X-junctions, a diagonal meeting a
 * straight wall). Straight-through nodes and free ends get no post, so a
 * merged straight run stays perfectly seamless.
 */
export const wallJointNodes = (objects: SceneObject[]): Cell[] => {
  const map = new Map<string, { cell: Cell; directions: Set<EdgeDirection> }>()
  for (const o of objects) {
    if (!isEdgeType(o.type)) continue
    const direction = edgeDirection(o.rotation)
    for (const n of edgeNodes(o)) {
      const k = `${n.x},${n.z}`
      const e = map.get(k) ?? { cell: n, directions: new Set<EdgeDirection>() }
      e.directions.add(direction)
      map.set(k, e)
    }
  }
  return [...map.values()].filter((e) => e.directions.size > 1).map((e) => e.cell)
}
