import type { ReactNode } from "react"
import { WALL } from "../../objects/dimensions"
import type { Cell } from "../../types"
import type { Extent } from "../shapes"

/** Half a wall's thickness (plan units). */
export const HALF_WALL = WALL.depth / 2

/** Adds a node to the drawing, depth-sorted by its extent. */
export type Push = (extent: Extent, node: ReactNode) => void

interface PieceOptions {
  opacity?: number
  /** How far past its ends it reaches (overlapping its neighbours). */
  extend?: number
  /** Half its thickness. */
  across?: number
  /** Its top (m). */
  y1?: number
}

/** A straight piece's line: world coords `from`..`to` along the run, `fixed` across it. */
export interface WallLine {
  alongX: boolean
  fixed: number
  from: number
  to: number
}

/** A diagonal piece's line, from node `start` to node `end`. */
export interface WallDiagonal {
  start: Cell
  end: Cell
}

/** Draws wall pieces — straight or diagonal, one colour or each face its own — into `push`. */
export const createWallPieces = (push: Push) => {
  /**
   * A wall piece along its line, full thickness. Its ends overlap the
   * neighbours by half a wall, so corners close.
   */
  const wallPiece = (
    { alongX, fixed, from, to }: WallLine,
    color: string,
    { opacity = 1, extend = HALF_WALL, across = HALF_WALL, y1 = WALL.height }: PieceOptions = {}
  ) => {
    const low = from - extend
    const high = to + extend
    const extent: Extent = alongX
      ? { x0: low, x1: high, z0: fixed - across, z1: fixed + across, y0: 0, y1 }
      : { x0: fixed - across, x1: fixed + across, z0: low, z1: high, y0: 0, y1 }
    push(
      extent,
      <rect
        x={extent.x0}
        y={extent.z0}
        width={extent.x1 - extent.x0}
        height={extent.z1 - extent.z0}
        fill={color}
        opacity={opacity < 1 ? opacity : undefined}
      />
    )
  }

  /** A wall piece on a diagonal, from node `start` to `end`: a turned bar, its ends overlapping corners. */
  const diagonalWallPiece = (
    { start, end }: WallDiagonal,
    color: string,
    { opacity = 1, extend = HALF_WALL, across = HALF_WALL, y1 = WALL.height }: PieceOptions = {}
  ) => {
    const length = Math.hypot(end.x - start.x, end.z - start.z)
    const [unitX, unitZ] = [(end.x - start.x) / length, (end.z - start.z) / length]
    const [normalX, normalZ] = [-unitZ * across, unitX * across]
    const [startX, startZ] = [start.x - unitX * extend, start.z - unitZ * extend]
    const [endX, endZ] = [end.x + unitX * extend, end.z + unitZ * extend]
    const corners = [
      [startX + normalX, startZ + normalZ],
      [endX + normalX, endZ + normalZ],
      [endX - normalX, endZ - normalZ],
      [startX - normalX, startZ - normalZ],
    ]
    const xs = corners.map((corner) => corner[0])
    const zs = corners.map((corner) => corner[1])
    push(
      {
        x0: Math.min(...xs),
        x1: Math.max(...xs),
        z0: Math.min(...zs),
        z1: Math.max(...zs),
        y0: 0,
        y1,
      },
      <polygon
        points={corners.map((corner) => corner.join(",")).join(" ")}
        fill={color}
        opacity={opacity < 1 ? opacity : undefined}
      />
    )
  }

  /**
   * A wall piece whose faces may be painted apart: then two half-thick strips,
   * the front one on the line's +Z (along X) or +X (along Z) side.
   */
  const facedWallPiece = (
    line: WallLine,
    [front, back]: [string, string],
    options: PieceOptions = {}
  ) => {
    if (front === back) return wallPiece(line, front, options)

    const half = (options.across ?? HALF_WALL) / 2
    wallPiece({ ...line, fixed: line.fixed + half }, front, { ...options, across: half })
    wallPiece({ ...line, fixed: line.fixed - half }, back, { ...options, across: half })
  }

  /** The same on a diagonal, built at `rotation` (its front: +Z turned by it). */
  const facedDiagonalWallPiece = (
    diagonal: WallDiagonal & { rotation: number },
    [front, back]: [string, string],
    options: PieceOptions = {}
  ) => {
    const { start, end, rotation } = diagonal
    if (front === back) return diagonalWallPiece(diagonal, front, options)

    const half = (options.across ?? HALF_WALL) / 2
    const [normalX, normalZ] = [Math.sin(rotation) * half, Math.cos(rotation) * half]
    for (const [color, side] of [
      [front, 1],
      [back, -1],
    ] as const) {
      const shift = (node: Cell) => ({ x: node.x + normalX * side, z: node.z + normalZ * side })
      diagonalWallPiece({ start: shift(start), end: shift(end) }, color, {
        ...options,
        across: half,
      })
    }
  }

  return { wallPiece, diagonalWallPiece, facedWallPiece, facedDiagonalWallPiece }
}

export type WallPieces = ReturnType<typeof createWallPieces>
