import { isEdgeType, isMarker, type Cell, type SceneObject } from "../types"
import { SEG, edgeDirection, unitEdges } from "./edges"

/**
 * A grid square of floor inside the walls. `parts` is set when a diagonal wall
 * cuts the square and only some of it is inside: which of its four triangles
 * (between its diagonals) are — FLOOR_PART bits. Unset: the whole square.
 */
export interface FloorCell extends Cell {
  parts?: number
}
/** A square's four triangles, between its two diagonals (z grows "north"). */
export const FLOOR_PART = { south: 1, east: 2, north: 4, west: 8 } as const
const WHOLE = 15

/**
 * The SEG×SEG grid cells fully enclosed by walls/doors — i.e. the office interior,
 * for tinting the floor. Walls/doors sit on cell edges and block passage; a
 * flood-fill from the outside marks everything reachable, and whatever it can't
 * reach is "inside". Handles concave shapes and interior partitions; doors count
 * as barriers so a room stays enclosed. Each returned cell spans [x,x+SEG]×[z,z+SEG].
 */
export const enclosedCells = (objects: SceneObject[]): FloorCell[] =>
  enclosedRegions(objects).flat()

/**
 * The enclosed floor grouped into ROOMS: connected parts of the interior
 * (reachable from each other without crossing a wall/door/window). Used to
 * paint each room's floor separately.
 *
 * The flood runs over triangles — each grid square split by its two diagonals
 * into south, east, north and west — so a diagonal wall (a square's diagonal)
 * can close a room as well as one on the square's sides.
 */
export const enclosedRegions = (objects: SceneObject[]): FloorCell[][] => {
  const blockedH = new Set<string>() // `i,j` blocks cells (i,j-1) ↔ (i,j)
  const blockedV = new Set<string>() // `i,j` blocks cells (i-1,j) ↔ (i,j)
  const diagonals = new Map<string, number>() // cell `i,j` → 1 rising, 2 falling (bits)
  let minI = Infinity
  let maxI = -Infinity
  let minJ = Infinity
  let maxJ = -Infinity
  const touch = (i: number, j: number) => {
    if (i < minI) minI = i
    if (i > maxI) maxI = i
    if (j < minJ) minJ = j
    if (j > maxJ) maxJ = j
  }

  for (const o of objects) {
    if (!isEdgeType(o.type)) continue
    for (const e of unitEdges(o)) {
      const direction = edgeDirection(e.rotation)
      if (direction === "x") {
        const i = Math.round((e.x - SEG / 2) / SEG)
        const j = Math.round(e.z / SEG)
        blockedH.add(`${i},${j}`)
        touch(i, j - 1)
        touch(i, j)
      } else if (direction === "z") {
        const i = Math.round(e.x / SEG)
        const j = Math.round((e.z - SEG / 2) / SEG)
        blockedV.add(`${i},${j}`)
        touch(i - 1, j)
        touch(i, j)
      } else {
        const i = Math.floor(e.x / SEG)
        const j = Math.floor(e.z / SEG)
        const k = `${i},${j}`
        diagonals.set(k, (diagonals.get(k) ?? 0) | (direction === "rising" ? 1 : 2))
        touch(i, j)
      }
    }
  }
  if (!Number.isFinite(minI)) return []

  // One ring of outside to flood from; triangles indexed in typed arrays.
  const loI = minI - 1
  const loJ = minJ - 1
  const width = maxI - minI + 3
  const height = maxJ - minJ + 3
  const S = 0
  const E = 1
  const N = 2
  const W = 3
  const index = (i: number, j: number, t: number) => ((i - loI) * height + (j - loJ)) * 4 + t
  const inGrid = (i: number, j: number) =>
    i >= loI && i < loI + width && j >= loJ && j < loJ + height

  /** Triangles a triangle opens onto: its cell's two neighbours, and across the cell side. */
  const neighbours = (i: number, j: number, t: number, out: [number, number, number][]) => {
    out.length = 0
    const d = diagonals.get(`${i},${j}`) ?? 0
    const isRising = (d & 1) !== 0 // SW–NE: parts S|W and N|E
    const isFalling = (d & 2) !== 0 // NW–SE: parts N|W and S|E
    const inner = (u: number, blocked: boolean) => {
      if (!blocked) out.push([i, j, u])
    }
    if (t === S) {
      inner(E, isFalling)
      inner(W, isRising)
      if (!blockedH.has(`${i},${j}`)) out.push([i, j - 1, N])
    } else if (t === E) {
      inner(S, isFalling)
      inner(N, isRising)
      if (!blockedV.has(`${i + 1},${j}`)) out.push([i + 1, j, W])
    } else if (t === N) {
      inner(E, isRising)
      inner(W, isFalling)
      if (!blockedH.has(`${i},${j + 1}`)) out.push([i, j + 1, S])
    } else {
      inner(S, isRising)
      inner(N, isFalling)
      if (!blockedV.has(`${i},${j}`)) out.push([i - 1, j, E])
    }
    return out
  }

  const outside = new Uint8Array(width * height * 4)
  const stack: [number, number, number][] = []
  const next: [number, number, number][] = []
  const visitOutside = (i: number, j: number, t: number) => {
    if (!inGrid(i, j)) return
    const k = index(i, j, t)
    if (outside[k]) return
    outside[k] = 1
    stack.push([i, j, t])
  }
  for (let i = loI; i < loI + width; i++)
    for (const j of [loJ, loJ + height - 1]) for (let t = 0; t < 4; t++) visitOutside(i, j, t)
  for (let j = loJ; j < loJ + height; j++)
    for (const i of [loI, loI + width - 1]) for (let t = 0; t < 4; t++) visitOutside(i, j, t)
  while (stack.length) {
    const [i, j, t] = stack.pop() as [number, number, number]
    for (const [ni, nj, nt] of neighbours(i, j, t, next)) visitOutside(ni, nj, nt)
  }

  // Rooms: each unvisited triangle's component, gathered per square.
  const seen = new Uint8Array(width * height * 4)
  const regions: FloorCell[][] = []
  for (let i = minI; i <= maxI; i++)
    for (let j = minJ; j <= maxJ; j++)
      for (let t = 0; t < 4; t++) {
        const k0 = index(i, j, t)
        if (outside[k0] || seen[k0]) continue
        const parts = new Map<string, FloorCell>()
        const queue: [number, number, number][] = [[i, j, t]]
        seen[k0] = 1
        while (queue.length) {
          const [ci, cj, ct] = queue.pop() as [number, number, number]
          const key = `${ci},${cj}`
          const cell = parts.get(key) ?? { x: ci * SEG, z: cj * SEG, parts: 0 }
          cell.parts = (cell.parts ?? 0) | (1 << ct)
          parts.set(key, cell)
          for (const [ni, nj, nt] of neighbours(ci, cj, ct, next)) {
            if (!inGrid(ni, nj)) continue
            const k = index(ni, nj, nt)
            if (outside[k] || seen[k]) continue
            seen[k] = 1
            queue.push([ni, nj, nt])
          }
        }
        regions.push([...parts.values()].map((c) => (c.parts === WHOLE ? { x: c.x, z: c.z } : c)))
      }
  return regions
}

/** The SEG cell (its min corner) containing a floor point. */
export const cellAt = (x: number, z: number): Cell => ({
  x: Math.floor(x / SEG) * SEG,
  z: Math.floor(z / SEG) * SEG,
})

/** Whether a floor point lies in a region's cells (a split square: its parts). */
export const isInRegion = (cells: Map<string, FloorCell>, x: number, z: number) => {
  const { x: cx, z: cz } = cellAt(x, z)
  const cell = cells.get(`${cx},${cz}`)
  if (!cell) return false
  if (cell.parts === undefined) return true
  const u = (x - cx) / SEG
  const v = (z - cz) / SEG
  const part =
    v < u && v < 1 - u
      ? FLOOR_PART.south
      : v > u && v > 1 - u
        ? FLOOR_PART.north
        : u > v
          ? FLOOR_PART.east
          : FLOOR_PART.west
  return (cell.parts & part) !== 0
}

/**
 * The furniture standing in the room that contains (x, z) — every piece whose
 * centre is on that room's floor. Empty when the point isn't inside a room.
 */
export const furnitureInRoomAt = (objects: SceneObject[], x: number, z: number): string[] => {
  const room = enclosedRegions(objects).find((r) =>
    r.some((c) => c.x <= x && x < c.x + SEG && c.z <= z && z < c.z + SEG)
  )
  if (!room) return []
  const cells = new Set(room.map((c) => `${c.x},${c.z}`))
  return objects
    .filter(
      (o) =>
        !isEdgeType(o.type) &&
        !isMarker(o.type) &&
        cells.has(`${Math.floor(o.x / SEG) * SEG},${Math.floor(o.z / SEG) * SEG}`)
    )
    .map((o) => o.id)
}
