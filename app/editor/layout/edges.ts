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
import { getEdge } from "../catalog"

/**
 * Which way a wall/door edge runs: along X, along Z, or across a grid square
 * corner to corner — "rising" (x and z grow together) or "falling" (z drops as
 * x grows). A piece runs along its local X, turned by its rotation.
 */
export type EdgeDirection = "x" | "z" | "rising" | "falling"

const DIRECTION_BY_EIGHTHS: EdgeDirection[] = ["x", "falling", "z", "rising"]

export const edgeDirection = (rotation: number): EdgeDirection => {
  const eighths = Math.round((((rotation % Math.PI) + Math.PI) % Math.PI) / (Math.PI / 4)) % 4

  return DIRECTION_BY_EIGHTHS[eighths]
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
export const edgeLength = (edge: { type?: ObjectType; rotation?: number }) =>
  (isOpening(edge.type) ? DOOR_SEGS : 1) *
  (edge.rotation !== undefined && isDiagonalEdge(edge.rotation) ? SEG * Math.SQRT2 : SEG)

/**
 * The unit (SEG-long) edges an edge object covers: a wall is one, a door two.
 * Everything that reasons about "which edges are taken/blocked" uses these.
 */
export const unitEdges = (edge: SceneObject): WallCell[] => {
  if (!isOpening(edge.type)) return [{ x: edge.x, z: edge.z, rotation: edge.rotation }]

  const [stepX, stepZ] = edgeStep(edge.rotation)

  return [-0.5, 0.5].map((fraction) => ({
    x: edge.x + fraction * stepX,
    z: edge.z + fraction * stepZ,
    rotation: edge.rotation,
  }))
}

/** Stable key of a unit edge (position + direction). */
export const edgeKey = (edge: WallCell) => `${edge.x},${edge.z},${edgeDirection(edge.rotation)}`

/**
 * Upgrade layouts saved with the old 1-unit wall segments: each becomes two
 * half segments. Old wall centres sit on multiples of 0.5 along their run; new
 * ones on odd quarters (x.25 / x.75), so detection is exact and this is
 * idempotent. Doors kept their 1-unit size, so they need no change.
 */
export const normalizeEdges = (objects: SceneObject[]): SceneObject[] => {
  if (!objects.some((wall) => wall.type === "wall" && isLegacyWall(wall))) return objects

  return objects.flatMap((wall) => {
    if (wall.type !== "wall" || !isLegacyWall(wall)) return [wall]

    const half = SEG / 2
    const alongX = runsAlongX(wall.rotation)

    return [-half, half].map((offset, i) => ({
      ...wall,
      id: `${wall.id}${i ? "b" : "a"}`,
      x: alongX ? wall.x + offset : wall.x,
      z: alongX ? wall.z : wall.z + offset,
    }))
  })
}
const isLegacyWall = (wall: SceneObject) => {
  if (isDiagonalEdge(wall.rotation)) return false // diagonals came later

  const along = runsAlongX(wall.rotation) ? wall.x : wall.z

  return Math.round(along * 4) % 2 === 0
}

/** A glass partition, or an opening cut into one. */
export const isGlassEdge = (edge: SceneObject) =>
  !!getEdge(edge.type)?.isSeeThrough || edge.model === GLASS_HOST

/** A solid wall run: what windows show the paint of, and what wall items hang on. */
export const isSolidWall = (segment: SceneObject) => {
  const edge = getEdge(segment.type)

  return edge?.role === "run" && !edge.isSeeThrough
}

/** The two grid nodes at the ends of a wall/door edge. */
export const edgeNodes = (edge: SceneObject): [Cell, Cell] => {
  const [stepX, stepZ] = edgeStep(edge.rotation)
  const half = (isOpening(edge.type) ? DOOR_SEGS : 1) / 2

  return [
    { x: edge.x - half * stepX, z: edge.z - half * stepZ },
    { x: edge.x + half * stepX, z: edge.z + half * stepZ },
  ]
}

/** Shortest distance from a point to a line segment. */
const distanceToSegment = (point: Cell, start: Cell, end: Cell) => {
  const deltaX = end.x - start.x
  const deltaZ = end.z - start.z
  const lengthSquared = deltaX * deltaX + deltaZ * deltaZ || 1
  let fraction = ((point.x - start.x) * deltaX + (point.z - start.z) * deltaZ) / lengthSquared
  fraction = Math.max(0, Math.min(1, fraction))
  const closestX = start.x + fraction * deltaX
  const closestZ = start.z + fraction * deltaZ

  return Math.hypot(point.x - closestX, point.z - closestZ)
}

/** Id of the wall/door segment nearest a point, within `maxDistance`, else null. */
export const nearestEdgeId = (
  objects: SceneObject[],
  pointX: number,
  pointZ: number,
  maxDistance = 0.45,
  accept: (edge: SceneObject) => boolean = (edge) => isEdgeType(edge.type)
): string | null => {
  let best: string | null = null
  let bestDistance = maxDistance
  for (const edge of objects) {
    if (!accept(edge)) continue

    const [start, end] = edgeNodes(edge)
    const distance = distanceToSegment({ x: pointX, z: pointZ }, start, end)
    if (distance < bestDistance) {
      bestDistance = distance
      best = edge.id
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
  for (const edge of objects) {
    if (!isEdgeType(edge.type)) continue

    const direction = edgeDirection(edge.rotation)
    for (const node of edgeNodes(edge)) {
      const key = `${node.x},${node.z}`
      const junction = map.get(key) ?? { cell: node, directions: new Set<EdgeDirection>() }
      junction.directions.add(direction)
      map.set(key, junction)
    }
  }

  return [...map.values()]
    .filter((junction) => junction.directions.size > 1)
    .map((junction) => junction.cell)
}
