import { isEdgeType, isMarker, type Cell, type SceneObject } from "../types"
import { getEdge } from "../catalog"
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
  const blockedAlongX = new Set<string>() // `i,j` blocks cells (i,j-1) ↔ (i,j)
  const blockedAlongZ = new Set<string>() // `i,j` blocks cells (i-1,j) ↔ (i,j)
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

  for (const object of objects) {
    if (!getEdge(object.type)?.encloses) continue

    for (const edge of unitEdges(object)) {
      const direction = edgeDirection(edge.rotation)
      if (direction === "x") {
        const i = Math.round((edge.x - SEG / 2) / SEG)
        const j = Math.round(edge.z / SEG)
        blockedAlongX.add(`${i},${j}`)
        touch(i, j - 1)
        touch(i, j)
      } else if (direction === "z") {
        const i = Math.round(edge.x / SEG)
        const j = Math.round((edge.z - SEG / 2) / SEG)
        blockedAlongZ.add(`${i},${j}`)
        touch(i - 1, j)
        touch(i, j)
      } else {
        const i = Math.floor(edge.x / SEG)
        const j = Math.floor(edge.z / SEG)
        const key = `${i},${j}`
        diagonals.set(key, (diagonals.get(key) ?? 0) | (direction === "rising" ? 1 : 2))
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
  const SOUTH = 0
  const EAST = 1
  const NORTH = 2
  const WEST = 3
  const index = (i: number, j: number, triangle: number) =>
    ((i - loI) * height + (j - loJ)) * 4 + triangle
  const inGrid = (i: number, j: number) =>
    i >= loI && i < loI + width && j >= loJ && j < loJ + height

  /** Triangles a triangle opens onto: its cell's two neighbours, and across the cell side. */
  const neighbours = (i: number, j: number, triangle: number, out: [number, number, number][]) => {
    out.length = 0
    const diagonalBits = diagonals.get(`${i},${j}`) ?? 0
    const isRising = (diagonalBits & 1) !== 0 // SW–NE: parts S|W and N|E
    const isFalling = (diagonalBits & 2) !== 0 // NW–SE: parts N|W and S|E
    const inner = (target: number, blocked: boolean) => {
      if (!blocked) out.push([i, j, target])
    }
    if (triangle === SOUTH) {
      inner(EAST, isFalling)
      inner(WEST, isRising)
      if (!blockedAlongX.has(`${i},${j}`)) out.push([i, j - 1, NORTH])
    } else if (triangle === EAST) {
      inner(SOUTH, isFalling)
      inner(NORTH, isRising)
      if (!blockedAlongZ.has(`${i + 1},${j}`)) out.push([i + 1, j, WEST])
    } else if (triangle === NORTH) {
      inner(EAST, isRising)
      inner(WEST, isFalling)
      if (!blockedAlongX.has(`${i},${j + 1}`)) out.push([i, j + 1, SOUTH])
    } else {
      inner(SOUTH, isRising)
      inner(NORTH, isFalling)
      if (!blockedAlongZ.has(`${i},${j}`)) out.push([i - 1, j, EAST])
    }

    return out
  }

  const outside = new Uint8Array(width * height * 4)
  const stack: [number, number, number][] = []
  const next: [number, number, number][] = []
  const visitOutside = (i: number, j: number, triangle: number) => {
    if (!inGrid(i, j)) return

    const triangleIndex = index(i, j, triangle)
    if (outside[triangleIndex]) return

    outside[triangleIndex] = 1
    stack.push([i, j, triangle])
  }
  for (let i = loI; i < loI + width; i++)
    for (const j of [loJ, loJ + height - 1])
      for (let triangle = 0; triangle < 4; triangle++) visitOutside(i, j, triangle)
  for (let j = loJ; j < loJ + height; j++)
    for (const i of [loI, loI + width - 1])
      for (let triangle = 0; triangle < 4; triangle++) visitOutside(i, j, triangle)
  while (stack.length) {
    const [i, j, triangle] = stack.pop() as [number, number, number]
    for (const [nextI, nextJ, nextTriangle] of neighbours(i, j, triangle, next))
      visitOutside(nextI, nextJ, nextTriangle)
  }

  // Rooms: each unvisited triangle's component, gathered per square.
  const seen = new Uint8Array(width * height * 4)
  const regions: FloorCell[][] = []
  for (let i = minI; i <= maxI; i++)
    for (let j = minJ; j <= maxJ; j++)
      for (let triangle = 0; triangle < 4; triangle++) {
        const startIndex = index(i, j, triangle)
        if (outside[startIndex] || seen[startIndex]) continue

        const parts = new Map<string, FloorCell>()
        const queue: [number, number, number][] = [[i, j, triangle]]
        seen[startIndex] = 1
        while (queue.length) {
          const [currentI, currentJ, currentTriangle] = queue.pop() as [number, number, number]
          const key = `${currentI},${currentJ}`
          const cell = parts.get(key) ?? { x: currentI * SEG, z: currentJ * SEG, parts: 0 }
          cell.parts = (cell.parts ?? 0) | (1 << currentTriangle)
          parts.set(key, cell)
          for (const [nextI, nextJ, nextTriangle] of neighbours(
            currentI,
            currentJ,
            currentTriangle,
            next
          )) {
            if (!inGrid(nextI, nextJ)) continue

            const neighbourIndex = index(nextI, nextJ, nextTriangle)
            if (outside[neighbourIndex] || seen[neighbourIndex]) continue

            seen[neighbourIndex] = 1
            queue.push([nextI, nextJ, nextTriangle])
          }
        }
        regions.push(
          [...parts.values()].map((floorCell) =>
            floorCell.parts === WHOLE ? { x: floorCell.x, z: floorCell.z } : floorCell
          )
        )
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
  const { x: cellX, z: cellZ } = cellAt(x, z)
  const cell = cells.get(`${cellX},${cellZ}`)
  if (!cell) return false
  if (cell.parts === undefined) return true

  const offsetX = (x - cellX) / SEG
  const offsetZ = (z - cellZ) / SEG
  const part =
    offsetZ < offsetX && offsetZ < 1 - offsetX
      ? FLOOR_PART.south
      : offsetZ > offsetX && offsetZ > 1 - offsetX
        ? FLOOR_PART.north
        : offsetX > offsetZ
          ? FLOOR_PART.east
          : FLOOR_PART.west

  return (cell.parts & part) !== 0
}

/**
 * The furniture standing in the room that contains (x, z) — every piece whose
 * centre is on that room's floor. Empty when the point isn't inside a room.
 */
export const furnitureInRoomAt = (objects: SceneObject[], x: number, z: number): string[] => {
  const room = enclosedRegions(objects).find((region) =>
    region.some((cell) => cell.x <= x && x < cell.x + SEG && cell.z <= z && z < cell.z + SEG)
  )
  if (!room) return []

  const cells = new Set(room.map((cell) => `${cell.x},${cell.z}`))

  return objects
    .filter(
      (piece) =>
        !isEdgeType(piece.type) &&
        !isMarker(piece.type) &&
        cells.has(`${Math.floor(piece.x / SEG) * SEG},${Math.floor(piece.z / SEG) * SEG}`)
    )
    .map((piece) => piece.id)
}
