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
import { getItem } from "../catalog"
import { edgeLength, edgeStep, isDiagonalEdge, runsAlongX } from "./edges"
import { mountWalls } from "./mounts"
import { clampToFloor, footprintCells } from "./placement"
import { isDiagonal } from "./rotation"

/** A footprint: centre, half sizes along its own axes, and how far it's turned off the grid's. */
interface Rect {
  x: number
  z: number
  halfX: number
  halfZ: number
  /** 0 for a piece on the grid's axes (hx/hz already swapped for a quarter turn). */
  angle: number
}

/** A rectangle's own axes in the world (a piece's local X and Z, turned). */
const axesOf = (rect: Rect): [[number, number], [number, number]] => {
  const cosine = Math.cos(rect.angle)
  const sine = Math.sin(rect.angle)
  return [
    [cosine, -sine],
    [sine, cosine],
  ]
}

/** How far a rectangle reaches along a direction from its centre. */
const reachAlong = (rect: Rect, [directionX, directionZ]: [number, number]) => {
  const [firstAxis, secondAxis] = axesOf(rect)
  return (
    rect.halfX * Math.abs(firstAxis[0] * directionX + firstAxis[1] * directionZ) +
    rect.halfZ * Math.abs(secondAxis[0] * directionX + secondAxis[1] * directionZ)
  )
}

/** Overlaps must be deeper than this to count: pieces may touch, flush. */
const TOUCH = 1e-6

/**
 * Whether two footprints overlap (touching doesn't count). Axis-aligned pairs
 * compare boxes; a turned one is tested along each rectangle's axes — two
 * rectangles are apart exactly when they're apart along one of those.
 */
const rectsOverlap = (first: Rect, second: Rect) => {
  if (first.angle === 0 && second.angle === 0)
    return (
      Math.abs(second.x - first.x) < first.halfX + second.halfX &&
      Math.abs(second.z - first.z) < first.halfZ + second.halfZ
    )
  const deltaX = second.x - first.x
  const deltaZ = second.z - first.z
  return [...axesOf(first), ...axesOf(second)].every(
    (axis) =>
      Math.abs(deltaX * axis[0] + deltaZ * axis[1]) <
      reachAlong(first, axis) + reachAlong(second, axis) - TOUCH
  )
}

const footprintRect = (type: ObjectType, rotation: number, x: number, z: number): Rect => {
  if (isDiagonal(rotation)) {
    const [cellsX, cellsZ] = getItem(type).footprint
    return { x, z, halfX: (cellsX * GRID) / 2, halfZ: (cellsZ * GRID) / 2, angle: rotation }
  }
  const [cellsX, cellsZ] = footprintCells(type, rotation)
  return { x, z, halfX: (cellsX * GRID) / 2, halfZ: (cellsZ * GRID) / 2, angle: 0 }
}

/** Whether a piece's footprint (turned as it is) overlaps the grid square centred at (x, z). */
export const footprintOverlapsSquare = (piece: SceneObject, x: number, z: number) =>
  rectsOverlap(footprintRect(piece.type, piece.rotation, piece.x, piece.z), {
    x,
    z,
    halfX: GRID / 2,
    halfZ: GRID / 2,
    angle: 0,
  })

/**
 * Whether a wall/door edge cuts through a footprint's interior. The wall is
 * treated as its centre line, and comparisons are strict — so furniture may
 * stand flush against a wall (touching it), but never straddle one.
 */
const edgeCrossesRect = (
  edge: { x: number; z: number; rotation: number; type?: ObjectType },
  rect: Rect
) => {
  const halfLength = edgeLength(edge) / 2
  if (rect.angle !== 0 || isDiagonalEdge(edge.rotation)) {
    // A turned footprint, or a diagonal wall: the wall as a line (no
    // thickness), tested along its direction, across it, and the footprint's
    // own axes.
    const [stepX, stepZ] = edgeStep(edge.rotation)
    const length = Math.hypot(stepX, stepZ)
    const along: [number, number] = [stepX / length, stepZ / length]
    const across: [number, number] = [-along[1], along[0]]
    const deltaX = rect.x - edge.x
    const deltaZ = rect.z - edge.z
    return [along, across, ...axesOf(rect)].every(
      (axis) =>
        Math.abs(deltaX * axis[0] + deltaZ * axis[1]) <
        halfLength * Math.abs(along[0] * axis[0] + along[1] * axis[1]) +
          reachAlong(rect, axis) -
          TOUCH
    )
  }
  return runsAlongX(edge.rotation)
    ? rect.z - rect.halfZ < edge.z &&
        edge.z < rect.z + rect.halfZ &&
        rect.x - rect.halfX < edge.x + halfLength &&
        edge.x - halfLength < rect.x + rect.halfX
    : rect.x - rect.halfX < edge.x &&
        edge.x < rect.x + rect.halfX &&
        rect.z - rect.halfZ < edge.z + halfLength &&
        edge.z - halfLength < rect.z + rect.halfZ
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
  const moving = footprintRect(type, rotation, x, z)
  for (const other of objects) {
    if (other.id === ignoreId || isMarker(other.type)) continue
    if (isEdgeType(other.type)) {
      if (!isOverhead(type) && edgeCrossesRect(other, moving)) return true
      continue
    }
    // Overhead items (ceiling lights) and wall items only bump into their own kind.
    if (layerOf(type) !== layerOf(other.type)) continue
    if (getItem(type).isUnderlay || getItem(other.type).isUnderlay) continue
    if (rectsOverlap(moving, footprintRect(other.type, other.rotation, other.x, other.z)))
      return true
  }
  return false
}

/**
 * Whether moving a GROUP of furniture to new positions would collide — with
 * anything not in the group, or with each other — or leave the floor.
 */
export const groupCollides = (objects: SceneObject[], moved: SceneObject[]): boolean => {
  const ids = new Set(moved.map((piece) => piece.id))
  const others = objects.filter((other) => !ids.has(other.id))
  return moved.some((piece) => {
    const clamped = clampToFloor(piece.type, piece.rotation, { x: piece.x, z: piece.z })
    if (clamped.x !== piece.x || clamped.z !== piece.z) return true
    const rest = [...others, ...moved.filter((other) => other.id !== piece.id)]
    return furnitureCollides(rest, piece.type, piece.x, piece.z, piece.rotation)
  })
}

/** Whether a wall/door edge would cut through any placed furniture (rugs included). */
export const edgeBlocked = (objects: SceneObject[], edge: WallCell): boolean =>
  objects.some(
    (piece) =>
      !isEdgeType(piece.type) &&
      !isOverhead(piece.type) &&
      !isMarker(piece.type) &&
      edgeCrossesRect(edge, footprintRect(piece.type, piece.rotation, piece.x, piece.z))
  )
