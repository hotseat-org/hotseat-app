import type { ReactNode } from "react"
import { WALL } from "../../objects/dimensions"
import type { Cell } from "../../types"
import type { Extent } from "../shapes"

/** Half a wall's thickness (plan units). */
export const HALF_WALL = WALL.depth / 2

/** Adds a node to the drawing, depth-sorted by its extent. */
export type Push = (ext: Extent, node: ReactNode) => void

interface PieceOptions {
  opacity?: number
  /** How far past its ends it reaches (overlapping its neighbours). */
  extend?: number
  /** Half its thickness. */
  across?: number
  /** Its top (m). */
  y1?: number
}

/** Draws wall pieces — straight or diagonal, one colour or each face its own — into `push`. */
export const createWallPieces = (push: Push) => {
  /**
   * A wall piece along its line from `from` to `to` (world coords along the
   * run; `fixed` across it), full thickness. Its ends overlap the neighbours
   * by half a wall, so corners close.
   */
  const wallPiece = (
    alongX: boolean,
    fixed: number,
    from: number,
    to: number,
    color: string,
    { opacity = 1, extend = HALF_WALL, across = HALF_WALL, y1 = WALL.height }: PieceOptions = {}
  ) => {
    const lo = from - extend
    const hi = to + extend
    const ext: Extent = alongX
      ? { x0: lo, x1: hi, z0: fixed - across, z1: fixed + across, y0: 0, y1 }
      : { x0: fixed - across, x1: fixed + across, z0: lo, z1: hi, y0: 0, y1 }
    push(
      ext,
      <rect
        x={ext.x0}
        y={ext.z0}
        width={ext.x1 - ext.x0}
        height={ext.z1 - ext.z0}
        fill={color}
        opacity={opacity < 1 ? opacity : undefined}
      />
    )
  }

  /** A wall piece on a diagonal, from node `a` to `b`: a turned bar, its ends overlapping corners. */
  const diagonalWallPiece = (
    a: Cell,
    b: Cell,
    color: string,
    { opacity = 1, extend = HALF_WALL, across = HALF_WALL, y1 = WALL.height }: PieceOptions = {}
  ) => {
    const length = Math.hypot(b.x - a.x, b.z - a.z)
    const [ux, uz] = [(b.x - a.x) / length, (b.z - a.z) / length]
    const [nx, nz] = [-uz * across, ux * across]
    const [ax, az] = [a.x - ux * extend, a.z - uz * extend]
    const [bx, bz] = [b.x + ux * extend, b.z + uz * extend]
    const corners = [
      [ax + nx, az + nz],
      [bx + nx, bz + nz],
      [bx - nx, bz - nz],
      [ax - nx, az - nz],
    ]
    const xs = corners.map((c) => c[0])
    const zs = corners.map((c) => c[1])
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
        points={corners.map((c) => c.join(",")).join(" ")}
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
    alongX: boolean,
    fixed: number,
    from: number,
    to: number,
    [front, back]: [string, string],
    options: PieceOptions = {}
  ) => {
    if (front === back) return wallPiece(alongX, fixed, from, to, front, options)
    const half = (options.across ?? HALF_WALL) / 2
    wallPiece(alongX, fixed + half, from, to, front, { ...options, across: half })
    wallPiece(alongX, fixed - half, from, to, back, { ...options, across: half })
  }

  /** The same on a diagonal, built at `rotation` (its front: +Z turned by it). */
  const facedDiagonalWallPiece = (
    a: Cell,
    b: Cell,
    rotation: number,
    [front, back]: [string, string],
    options: PieceOptions = {}
  ) => {
    if (front === back) return diagonalWallPiece(a, b, front, options)
    const half = (options.across ?? HALF_WALL) / 2
    const [nx, nz] = [Math.sin(rotation) * half, Math.cos(rotation) * half]
    for (const [color, side] of [
      [front, 1],
      [back, -1],
    ] as const) {
      const shift = (c: Cell) => ({ x: c.x + nx * side, z: c.z + nz * side })
      diagonalWallPiece(shift(a), shift(b), color, { ...options, across: half })
    }
  }

  return { wallPiece, diagonalWallPiece, facedWallPiece, facedDiagonalWallPiece }
}

export type WallPieces = ReturnType<typeof createWallPieces>
