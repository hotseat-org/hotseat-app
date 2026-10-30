import { SEG, enclosedRegions, footprintCells } from "./layout"
import { GRID, isObjectType, type SceneObject, type Tool } from "./types"

/**
 * How far any ground point is from what's built — the nearest wall, piece or
 * room floor — in metres, plus the flat plateau that hugs it. Shared by the
 * contour land (which slopes away by this distance, so it follows the
 * building's shape), the plateau drawn in 2D and 3D, and the editing grid.
 * World metres; one per layout (cached), null when nothing is built.
 */
export interface StructureField {
  /** Metres to the nearest wall/piece/floor (0 on them). */
  distanceAt: (x: number, z: number) => number
  /** The plateau's outline(s): closed loops of [x, z] points (holes included). */
  plateau: [number, number][][]
  /** The distance grid itself (for a texture): metres, w × h cells of GRID. */
  grid: { cells: Float32Array; width: number; height: number; x0: number; z0: number }
}

/** The plateau reaches this far out from the structure (m). */
export const PLATEAU_MARGIN = 1
/** The distance grid covers this far round the structure (m): past it the
 *  land is far enough out that the plain bounding-box distance will do. */
const FIELD_MARGIN = 24

/** The bounds of what's built (null when nothing is) — world metres. */
export const getStructureBounds = (objects: SceneObject[]) => {
  if (!objects.length) return null
  let x0 = Infinity
  let z0 = Infinity
  let x1 = -Infinity
  let z1 = -Infinity
  for (const piece of objects) {
    x0 = Math.min(x0, piece.x)
    z0 = Math.min(z0, piece.z)
    x1 = Math.max(x1, piece.x)
    z1 = Math.max(z1, piece.z)
  }
  // Positions are centres: allow for the pieces' own size (walls are thin).
  return { x0: x0 - 0.3, z0: z0 - 0.3, x1: x1 + 0.3, z1: z1 + 0.3 }
}

/** Two-pass chamfer distance (cells; 1 straight, √2 diagonal) over `cells` in place. */
const chamfer = (cells: Float32Array, width: number, height: number) => {
  const far = 1e6
  const diagonal = Math.SQRT2
  const at = (i: number, j: number) =>
    i < 0 || j < 0 || i >= width || j >= height ? far : cells[j * width + i]
  for (let j = 0; j < height; j++)
    for (let i = 0; i < width; i++) {
      const index = j * width + i
      cells[index] = Math.min(
        cells[index],
        at(i - 1, j) + 1,
        at(i, j - 1) + 1,
        at(i - 1, j - 1) + diagonal,
        at(i + 1, j - 1) + diagonal
      )
    }
  for (let j = height - 1; j >= 0; j--)
    for (let i = width - 1; i >= 0; i--) {
      const index = j * width + i
      cells[index] = Math.min(
        cells[index],
        at(i + 1, j) + 1,
        at(i, j + 1) + 1,
        at(i + 1, j + 1) + diagonal,
        at(i - 1, j + 1) + diagonal
      )
    }
}

/** Closed loops where the grid crosses `level` (marching squares + joining). */
const traceLoops = (
  cells: Float32Array,
  width: number,
  height: number,
  x0: number,
  z0: number,
  level: number
): [number, number][][] => {
  // Segments, keyed by their endpoints (shared edges give identical points).
  const key = (point: number[]) => `${point[0].toFixed(4)},${point[1].toFixed(4)}`
  const next = new Map<string, number[][]>()
  const link = (first: number[], second: number[]) => {
    for (const [source, target] of [
      [first, second],
      [second, first],
    ]) {
      const sourceKey = key(source)
      const list = next.get(sourceKey)
      if (list) list.push(target)
      else next.set(sourceKey, [target])
    }
  }
  for (let j = 0; j < height - 1; j++)
    for (let i = 0; i < width - 1; i++) {
      // Inside = closer than `level` (the plateau).
      const topLeft = cells[j * width + i]
      const topRight = cells[j * width + i + 1]
      const bottomRight = cells[(j + 1) * width + i + 1]
      const bottomLeft = cells[(j + 1) * width + i]
      const code =
        (topLeft < level ? 8 : 0) |
        (topRight < level ? 4 : 0) |
        (bottomRight < level ? 2 : 0) |
        (bottomLeft < level ? 1 : 0)
      if (code === 0 || code === 15) continue
      const x = x0 + i * GRID
      const z = z0 + j * GRID
      const at = (start: number, end: number) => (level - start) / (end - start)
      const top = [x + at(topLeft, topRight) * GRID, z]
      const right = [x + GRID, z + at(topRight, bottomRight) * GRID]
      const bottom = [x + at(bottomLeft, bottomRight) * GRID, z + GRID]
      const left = [x, z + at(topLeft, bottomLeft) * GRID]
      if (code === 1 || code === 14) link(left, bottom)
      else if (code === 2 || code === 13) link(bottom, right)
      else if (code === 3 || code === 12) link(left, right)
      else if (code === 4 || code === 11) link(top, right)
      else if (code === 6 || code === 9) link(top, bottom)
      else if (code === 7 || code === 8) link(left, top)
      else if (code === 5) {
        link(left, top)
        link(bottom, right)
      } else if (code === 10) {
        link(top, right)
        link(left, bottom)
      }
    }

  // Walk the segments into closed loops.
  const used = new Set<string>()
  const loops: [number, number][][] = []
  for (const [startKey, ends] of next) {
    if (used.has(startKey)) continue
    const start = startKey.split(",").map(Number)
    const loop: [number, number][] = [[start[0], start[1]]]
    used.add(startKey)
    let prev = startKey
    let current = ends[0]
    while (current) {
      const currentKey = key(current)
      if (currentKey === startKey) break
      if (used.has(currentKey)) break
      used.add(currentKey)
      loop.push([current[0], current[1]])
      const options = next.get(currentKey) ?? []
      const step =
        options.find((candidate) => key(candidate) !== prev && !used.has(key(candidate))) ??
        options.find((candidate) => key(candidate) === startKey)
      prev = currentKey
      current = step as number[]
    }
    if (loop.length > 3) loops.push(loop)
  }
  return loops
}

/**
 * A soft copy of the distances (three box blurs ≈ a Gaussian of ~2 m): the
 * land and plateau follow the building's overall shape in calm curves, not
 * every corner and the grid's octagonal facets.
 */
const blur = (cells: Float32Array, width: number, height: number, radius = 4, passes = 3) => {
  let source = Float32Array.from(cells)
  let target = new Float32Array(width * height)
  const size = radius * 2 + 1
  for (let pass = 0; pass < passes; pass++) {
    // Rows, then columns: a running sum, edges clamped.
    for (let j = 0; j < height; j++) {
      let sum = 0
      for (let i = -radius; i <= radius; i++)
        sum += source[j * width + Math.min(width - 1, Math.max(0, i))]
      for (let i = 0; i < width; i++) {
        target[j * width + i] = sum / size
        sum +=
          source[j * width + Math.min(width - 1, i + radius + 1)] -
          source[j * width + Math.max(0, i - radius)]
      }
    }
    ;[source, target] = [target, source]
    for (let i = 0; i < width; i++) {
      let sum = 0
      for (let j = -radius; j <= radius; j++)
        sum += source[Math.min(height - 1, Math.max(0, j)) * width + i]
      for (let j = 0; j < height; j++) {
        target[j * width + i] = sum / size
        sum +=
          source[Math.min(height - 1, j + radius + 1) * width + i] -
          source[Math.max(0, j - radius) * width + i]
      }
    }
    ;[source, target] = [target, source]
  }
  return source
}

/** Round a closed polyline's corners (Chaikin), so the 0.5 m steps don't show. */
const smooth = (loop: [number, number][], passes = 2) => {
  let points = loop
  for (let pass = 0; pass < passes; pass++) {
    const out: [number, number][] = []
    for (let i = 0; i < points.length; i++) {
      const [fromX, fromZ] = points[i]
      const [toX, toZ] = points[(i + 1) % points.length]
      out.push(
        [0.75 * fromX + 0.25 * toX, 0.75 * fromZ + 0.25 * toZ],
        [0.25 * fromX + 0.75 * toX, 0.25 * fromZ + 0.75 * toZ]
      )
    }
    points = out
  }
  return points
}

const build = (objects: SceneObject[]): StructureField | null => {
  const bounds = getStructureBounds(objects)
  if (!bounds) return null
  const x0 = Math.floor((bounds.x0 - FIELD_MARGIN) / GRID) * GRID
  const z0 = Math.floor((bounds.z0 - FIELD_MARGIN) / GRID) * GRID
  const width = Math.ceil((bounds.x1 + FIELD_MARGIN - x0) / GRID) + 1
  const height = Math.ceil((bounds.z1 + FIELD_MARGIN - z0) / GRID) + 1
  const cells = new Float32Array(width * height).fill(1e6)

  // Seed: the cells each wall and piece covers, and the rooms' floors (the
  // middle of a big open room is part of the building, however far from walls).
  for (const piece of objects) {
    const [cellsX, cellsZ] = isObjectType(piece.type as Tool)
      ? footprintCells(piece.type, piece.rotation)
      : [1, 1]
    const halfX = (Math.max(cellsX, 1) * GRID) / 2
    const halfZ = (Math.max(cellsZ, 1) * GRID) / 2
    const i0 = Math.max(0, Math.floor((piece.x - halfX - x0) / GRID))
    const i1 = Math.min(width - 1, Math.ceil((piece.x + halfX - x0) / GRID))
    const j0 = Math.max(0, Math.floor((piece.z - halfZ - z0) / GRID))
    const j1 = Math.min(height - 1, Math.ceil((piece.z + halfZ - z0) / GRID))
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) cells[j * width + i] = 0
  }
  for (const region of enclosedRegions(objects))
    for (const cell of region) {
      const i = Math.round((cell.x + SEG / 2 - x0) / GRID)
      const j = Math.round((cell.z + SEG / 2 - z0) / GRID)
      if (i >= 0 && j >= 0 && i < width && j < height) cells[j * width + i] = 0
    }
  chamfer(cells, width, height)
  for (let index = 0; index < cells.length; index++) cells[index] *= GRID // cells → metres

  // Past the grid: the bounding-box distance (the shape no longer matters there).
  const boxDistance = (x: number, z: number) =>
    Math.hypot(Math.max(bounds.x0 - x, 0, x - bounds.x1), Math.max(bounds.z0 - z, 0, z - bounds.z1))
  const soft = blur(cells, width, height)
  // Near the grid's edge, ease into the box distance (no seam in the land).
  const EASE = 6
  const distanceAt = (x: number, z: number) => {
    const gridI = (x - x0) / GRID
    const gridJ = (z - z0) / GRID
    if (gridI < 0 || gridJ < 0 || gridI >= width - 1 || gridJ >= height - 1)
      return boxDistance(x, z)
    const i = Math.floor(gridI)
    const j = Math.floor(gridJ)
    const fractionX = gridI - i
    const fractionZ = gridJ - j
    const top = soft[j * width + i] * (1 - fractionX) + soft[j * width + i + 1] * fractionX
    const bottom =
      soft[(j + 1) * width + i] * (1 - fractionX) + soft[(j + 1) * width + i + 1] * fractionX
    const distance = top * (1 - fractionZ) + bottom * fractionZ
    const edge = Math.min(gridI, gridJ, width - 1 - gridI, height - 1 - gridJ) * GRID
    if (edge >= EASE) return distance
    const progress = edge / EASE
    const eased = progress * progress * (3 - 2 * progress) // smoothstep
    return boxDistance(x, z) * (1 - eased) + distance * eased
  }

  const plateau = traceLoops(soft, width, height, x0, z0, PLATEAU_MARGIN).map((loop) =>
    smooth(loop)
  )
  return { distanceAt, plateau, grid: { cells, width: width, height: height, x0, z0 } }
}

/** One field per layout (the objects array is replaced on every change). */
const cache = new WeakMap<SceneObject[], StructureField | null>()
export const getStructureField = (objects: SceneObject[]) => {
  if (!cache.has(objects)) cache.set(objects, build(objects))
  return cache.get(objects) ?? null
}
