import {
  BUILD_HALF,
  GRID,
  isEdgeType,
  isOverhead,
  isWallMounted,
  type Cell,
  type ObjectType,
  type SceneObject,
} from "../types"
import { getItem } from "../catalog"
import { edgeStep, isDiagonalEdge } from "./edges"
import { ALONG_Z, isDiagonal, toRotationStep } from "./rotation"

/**
 * Footprint size in grid squares, accounting for rotation. A diagonal piece
 * gets the square its turned shape fits in — what anything working in whole
 * squares (snapping, the floor's edge, routes, framing) goes by; collisions use
 * the turned shape itself (see footprintRect).
 */
export const footprintCells = (type: ObjectType, rotation: number): [number, number] => {
  const [widthCells, depthCells] = getItem(type).footprint
  if (isDiagonal(rotation)) {
    const side = Math.ceil((widthCells + depthCells) * Math.SQRT1_2 - 1e-6)

    return [side, side]
  }

  const turned = Math.abs(Math.round(rotation / ALONG_Z)) % 2 === 1

  return turned ? [depthCells, widthCells] : [widthCells, depthCells]
}

/**
 * Snap one axis so a footprint of `cells` squares lands flush on grid lines.
 * A turn can leave the centre exactly between two places (when the count of
 * squares changes between odd and even): such ties always go up into an odd
 * count and down into an even one, so a piece turned full circle ends up
 * exactly where it started instead of creeping a quarter square per turn.
 */
export const snapAxis = (value: number, cells: number) =>
  cells % 2 === 0
    ? Math.ceil(value / GRID - 0.5) * GRID // even: centre on a grid line (ties down)
    : (Math.round(value / GRID - 0.5) + 0.5) * GRID // odd: centre in a square (ties up)

/** Snap a position so the object's footprint occupies whole grid squares. */
export const snapToFootprint = (type: ObjectType, rotation: number, x: number, z: number): Cell => {
  const [cellsX, cellsZ] = footprintCells(type, rotation)

  return { x: snapAxis(x, cellsX), z: snapAxis(z, cellsZ) }
}

/** How a furniture tool places: one piece, a row of copies, or a back-to-back pod of two rows. */
export type PlacementPattern = "single" | "row" | "pod"

/** Most copies one drag lays (a row across a big floor, not a runaway). */
const MAX_REPEAT = 40

/**
 * The copies a Row/Pod drag lays from `start` to `end`: side by side, flush,
 * along whichever of the piece's own directions (its width or its depth) the
 * drag follows more — a turned piece's too. A pod adds a second row back to
 * back with the first, turned to face the other way (desks facing across).
 */
export const composeRepeat = (
  type: ObjectType,
  rotation: number,
  start: Cell,
  end: Cell,
  pattern: Exclude<PlacementPattern, "single">
): { x: number; z: number; rotation: number }[] => {
  const [width, depth] = getItem(type).footprint
  // The piece's own axes in the world: X (its width) and Z (its depth, front +Z).
  const axisX = { x: Math.cos(rotation), z: -Math.sin(rotation) }
  const axisZ = { x: Math.sin(rotation), z: Math.cos(rotation) }
  const deltaX = end.x - start.x
  const deltaZ = end.z - start.z
  const alongWidth = (deltaX * axisX.x + deltaZ * axisX.z) / (width * GRID)
  const alongDepth = (deltaX * axisZ.x + deltaZ * axisZ.z) / (depth * GRID)
  // Rows run along the width unless the drag goes clearly more along the depth.
  const isAlongWidth = Math.abs(alongWidth) >= Math.abs(alongDepth) || pattern === "pod"
  const steps = isAlongWidth ? alongWidth : alongDepth
  const count = Math.min(MAX_REPEAT, Math.floor(Math.abs(steps) + 0.5) + 1)
  const axis = isAlongWidth ? axisX : axisZ
  const stride = (isAlongWidth ? width : depth) * GRID * Math.sign(steps || 1)
  const row = Array.from({ length: count }, (_, i) => ({
    x: start.x + axis.x * stride * i,
    z: start.z + axis.z * stride * i,
    rotation,
  }))
  if (pattern === "row") return row

  // Back to back: the second row behind the first (its −Z side), facing away.
  const behind = depth * GRID

  return [
    ...row,
    ...row.map((copy) => ({
      x: copy.x - axisZ.x * behind,
      z: copy.z - axisZ.z * behind,
      rotation: toRotationStep(rotation + Math.PI),
    })),
  ]
}

/** How far (m) beyond touching a diagonal wall a turned piece is pulled flush against it. */
const FLUSH_REACH = 0.6

/**
 * Where a piece goes for a cursor at (x, z): on the grid, kept on the floor —
 * or, turned to 45° beside a diagonal wall running the same way, flush against
 * that wall's face (back or side to it), slid along it in half-segment steps.
 * Grid points never put a turned piece flush with a diagonal: its centre must
 * sit half its depth from the wall's line, a distance with √2 in it.
 */
export const snapPlacement = (
  objects: SceneObject[],
  type: ObjectType,
  rotation: number,
  x: number,
  z: number
): Cell => {
  const onGrid = clampToFloor(type, rotation, snapToFootprint(type, rotation, x, z))
  if (!isDiagonal(rotation) || isWallMounted(type) || isOverhead(type)) return onGrid

  const [widthCells, depthCells] = getItem(type).footprint
  // The piece's own axes in the world: X (its width) and Z (its depth).
  const axisX = { x: Math.cos(rotation), z: -Math.sin(rotation) }
  let best: { gap: number; point: Cell } | null = null
  for (const segment of objects) {
    if (!isEdgeType(segment.type) || !isDiagonalEdge(segment.rotation)) continue

    const [stepX, stepZ] = edgeStep(segment.rotation)
    const length = Math.hypot(stepX, stepZ)
    const direction = { x: stepX / length, z: stepZ / length }
    const normal = { x: -direction.z, z: direction.x }
    // Width along the wall (back to it) or across it (side to it).
    const isBackToWall = Math.abs(axisX.x * direction.x + axisX.z * direction.z) > 0.99
    const flush = ((isBackToWall ? depthCells : widthCells) * GRID) / 2
    const across = (x - segment.x) * normal.x + (z - segment.z) * normal.z
    const along = (x - segment.x) * direction.x + (z - segment.z) * direction.z
    // Near this segment's face, beside it along the wall (with some slack).
    if (Math.abs(across) > flush + FLUSH_REACH) continue
    if (Math.abs(along) > length / 2 + flush + FLUSH_REACH) continue

    const gap = Math.abs(Math.abs(across) - flush)
    if (best && gap >= best.gap) continue

    const step = length / 2
    const snappedAlong = Math.round(along / step) * step
    const side = across >= 0 ? 1 : -1
    best = {
      gap,
      point: {
        x: segment.x + direction.x * snappedAlong + normal.x * side * flush,
        z: segment.z + direction.z * snappedAlong + normal.z * side * flush,
      },
    }
  }

  return best ? best.point : onGrid
}

/** Keep a footprint centred at (x,z) fully on the buildable floor. */
export const clampToFloor = (type: ObjectType, rotation: number, position: Cell): Cell => {
  const [cellsX, cellsZ] = footprintCells(type, rotation)
  const halfX = BUILD_HALF - (cellsX * GRID) / 2
  const halfZ = BUILD_HALF - (cellsZ * GRID) / 2

  return {
    x: Math.max(-halfX, Math.min(halfX, position.x)),
    z: Math.max(-halfZ, Math.min(halfZ, position.z)),
  }
}
