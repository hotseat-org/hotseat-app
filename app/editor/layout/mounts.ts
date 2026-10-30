import { GRID, type Cell, type ObjectType, type SceneObject } from "../types"
import { getItem } from "../catalog"
import { SEG, edgeStep, isDiagonalEdge, isSolidWall, nearestEdgeId, runsAlongX } from "./edges"
import { snapAxis } from "./placement"

/** Unit vector a piece faces (its +Z) at a rotation. */
const facing = (rotation: number) => ({ x: Math.sin(rotation), z: Math.cos(rotation) })

/** How near (m) a point must be to a wall's centre line to be on it. */
const ON_LINE = 0.02

/** The plain solid wall segment a point on a wall's line falls on, if any. */
const solidWallAt = (walls: SceneObject[], pointX: number, pointZ: number) =>
  walls.find((segment) => {
    const [stepX, stepZ] = edgeStep(segment.rotation)
    const length = Math.hypot(stepX, stepZ)
    const along = ((pointX - segment.x) * stepX + (pointZ - segment.z) * stepZ) / length
    const across = ((pointX - segment.x) * -stepZ + (pointZ - segment.z) * stepX) / length

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
  piece: Pick<SceneObject, "type" | "x" | "z" | "rotation">
): string[] | null => {
  const { type, x, z, rotation } = piece
  const [widthCells, depthCells] = getItem(type).footprint
  const front = facing(rotation)
  // Back-edge centre, and the direction along it (the piece's local X).
  const backX = x - (front.x * depthCells * GRID) / 2
  const backZ = z - (front.z * depthCells * GRID) / 2
  const along = { x: front.z, z: -front.x }
  const walls = objects.filter(isSolidWall)
  const ids = new Set<string>()
  // Points along the back edge, a grid step apart, each on solid wall.
  for (let i = 0; i < widthCells; i++) {
    const offset = (i - (widthCells - 1) / 2) * SEG
    const wall = solidWallAt(walls, backX + along.x * offset, backZ + along.z * offset)
    if (!wall) return null

    ids.add(wall.id)
  }

  return [...ids]
}

/**
 * Where a wall item goes for a cursor at `point`: against the face of the
 * nearest solid wall (within reach), facing the cursor's side, slid along the
 * wall to the cursor. Null when no wall is near.
 */
export const wallMount = (
  objects: SceneObject[],
  type: ObjectType,
  point: Cell
): { x: number; z: number; rotation: number } | null => {
  const id = nearestEdgeId(objects, point, { maxDistance: 0.8, accept: isSolidWall })
  const wall = id && objects.find((candidate) => candidate.id === id)
  if (!wall) return null

  const [widthCells, depthCells] = getItem(type).footprint
  const depth = (depthCells * GRID) / 2
  if (isDiagonalEdge(wall.rotation)) {
    // Along the diagonal's line in half-segment steps, out from its face.
    const [stepX, stepZ] = edgeStep(wall.rotation)
    const length = Math.hypot(stepX, stepZ)
    const direction = { x: stepX / length, z: stepZ / length }
    const normal = { x: -direction.z, z: direction.x }
    const side = (point.x - wall.x) * normal.x + (point.z - wall.z) * normal.z >= 0 ? 1 : -1
    const step = length / 2
    const snappedAlong =
      Math.round(((point.x - wall.x) * direction.x + (point.z - wall.z) * direction.z) / step) *
      step

    return {
      x: wall.x + direction.x * snappedAlong + normal.x * side * depth,
      z: wall.z + direction.z * snappedAlong + normal.z * side * depth,
      // Facing (sin r, cos r) = out from the wall.
      rotation: Math.atan2(normal.x * side, normal.z * side),
    }
  }
  if (runsAlongX(wall.rotation)) {
    const side = point.z >= wall.z ? 1 : -1

    return {
      x: snapAxis(point.x, widthCells),
      z: wall.z + side * depth,
      rotation: side > 0 ? 0 : Math.PI,
    }
  }

  const side = point.x >= wall.x ? 1 : -1

  return {
    x: wall.x + side * depth,
    z: snapAxis(point.z, widthCells),
    rotation: side > 0 ? Math.PI / 2 : (Math.PI * 3) / 2,
  }
}
