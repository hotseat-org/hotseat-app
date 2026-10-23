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
  grid: { cells: Float32Array; w: number; h: number; x0: number; z0: number }
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
  for (const o of objects) {
    x0 = Math.min(x0, o.x)
    z0 = Math.min(z0, o.z)
    x1 = Math.max(x1, o.x)
    z1 = Math.max(z1, o.z)
  }
  // Positions are centres: allow for the pieces' own size (walls are thin).
  return { x0: x0 - 0.3, z0: z0 - 0.3, x1: x1 + 0.3, z1: z1 + 0.3 }
}

/** Two-pass chamfer distance (cells; 1 straight, √2 diagonal) over `cells` in place. */
const chamfer = (cells: Float32Array, w: number, h: number) => {
  const far = 1e6
  const D = Math.SQRT2
  const at = (i: number, j: number) => (i < 0 || j < 0 || i >= w || j >= h ? far : cells[j * w + i])
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const k = j * w + i
      cells[k] = Math.min(
        cells[k],
        at(i - 1, j) + 1,
        at(i, j - 1) + 1,
        at(i - 1, j - 1) + D,
        at(i + 1, j - 1) + D
      )
    }
  for (let j = h - 1; j >= 0; j--)
    for (let i = w - 1; i >= 0; i--) {
      const k = j * w + i
      cells[k] = Math.min(
        cells[k],
        at(i + 1, j) + 1,
        at(i, j + 1) + 1,
        at(i + 1, j + 1) + D,
        at(i - 1, j + 1) + D
      )
    }
}

/** Closed loops where the grid crosses `level` (marching squares + joining). */
const traceLoops = (
  cells: Float32Array,
  w: number,
  h: number,
  x0: number,
  z0: number,
  level: number
): [number, number][][] => {
  // Segments, keyed by their endpoints (shared edges give identical points).
  const key = (p: number[]) => `${p[0].toFixed(4)},${p[1].toFixed(4)}`
  const next = new Map<string, number[][]>()
  const link = (p: number[], q: number[]) => {
    for (const [a, b] of [
      [p, q],
      [q, p],
    ]) {
      const k = key(a)
      const list = next.get(k)
      if (list) list.push(b)
      else next.set(k, [b])
    }
  }
  for (let j = 0; j < h - 1; j++)
    for (let i = 0; i < w - 1; i++) {
      // Inside = closer than `level` (the plateau).
      const a = cells[j * w + i]
      const b = cells[j * w + i + 1]
      const c = cells[(j + 1) * w + i + 1]
      const d = cells[(j + 1) * w + i]
      const code =
        (a < level ? 8 : 0) | (b < level ? 4 : 0) | (c < level ? 2 : 0) | (d < level ? 1 : 0)
      if (code === 0 || code === 15) continue
      const x = x0 + i * GRID
      const z = z0 + j * GRID
      const at = (p: number, q: number) => (level - p) / (q - p)
      const top = [x + at(a, b) * GRID, z]
      const right = [x + GRID, z + at(b, c) * GRID]
      const bottom = [x + at(d, c) * GRID, z + GRID]
      const left = [x, z + at(a, d) * GRID]
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
      const k = key(current)
      if (k === startKey) break
      if (used.has(k)) break
      used.add(k)
      loop.push([current[0], current[1]])
      const options = next.get(k) ?? []
      const step =
        options.find((p) => key(p) !== prev && !used.has(key(p))) ??
        options.find((p) => key(p) === startKey)
      prev = k
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
const blur = (cells: Float32Array, w: number, h: number, radius = 4, passes = 3) => {
  let src = Float32Array.from(cells)
  let dst = new Float32Array(w * h)
  const size = radius * 2 + 1
  for (let pass = 0; pass < passes; pass++) {
    // Rows, then columns: a running sum, edges clamped.
    for (let j = 0; j < h; j++) {
      let sum = 0
      for (let i = -radius; i <= radius; i++) sum += src[j * w + Math.min(w - 1, Math.max(0, i))]
      for (let i = 0; i < w; i++) {
        dst[j * w + i] = sum / size
        sum += src[j * w + Math.min(w - 1, i + radius + 1)] - src[j * w + Math.max(0, i - radius)]
      }
    }
    ;[src, dst] = [dst, src]
    for (let i = 0; i < w; i++) {
      let sum = 0
      for (let j = -radius; j <= radius; j++) sum += src[Math.min(h - 1, Math.max(0, j)) * w + i]
      for (let j = 0; j < h; j++) {
        dst[j * w + i] = sum / size
        sum += src[Math.min(h - 1, j + radius + 1) * w + i] - src[Math.max(0, j - radius) * w + i]
      }
    }
    ;[src, dst] = [dst, src]
  }
  return src
}

/** Round a closed polyline's corners (Chaikin), so the 0.5 m steps don't show. */
const smooth = (loop: [number, number][], passes = 2) => {
  let pts = loop
  for (let n = 0; n < passes; n++) {
    const out: [number, number][] = []
    for (let i = 0; i < pts.length; i++) {
      const [ax, az] = pts[i]
      const [bx, bz] = pts[(i + 1) % pts.length]
      out.push(
        [0.75 * ax + 0.25 * bx, 0.75 * az + 0.25 * bz],
        [0.25 * ax + 0.75 * bx, 0.25 * az + 0.75 * bz]
      )
    }
    pts = out
  }
  return pts
}

const build = (objects: SceneObject[]): StructureField | null => {
  const b = getStructureBounds(objects)
  if (!b) return null
  const x0 = Math.floor((b.x0 - FIELD_MARGIN) / GRID) * GRID
  const z0 = Math.floor((b.z0 - FIELD_MARGIN) / GRID) * GRID
  const w = Math.ceil((b.x1 + FIELD_MARGIN - x0) / GRID) + 1
  const h = Math.ceil((b.z1 + FIELD_MARGIN - z0) / GRID) + 1
  const cells = new Float32Array(w * h).fill(1e6)

  // Seed: the cells each wall and piece covers, and the rooms' floors (the
  // middle of a big open room is part of the building, however far from walls).
  for (const o of objects) {
    const [cx, cz] = isObjectType(o.type as Tool) ? footprintCells(o.type, o.rotation) : [1, 1]
    const hx = (Math.max(cx, 1) * GRID) / 2
    const hz = (Math.max(cz, 1) * GRID) / 2
    const i0 = Math.max(0, Math.floor((o.x - hx - x0) / GRID))
    const i1 = Math.min(w - 1, Math.ceil((o.x + hx - x0) / GRID))
    const j0 = Math.max(0, Math.floor((o.z - hz - z0) / GRID))
    const j1 = Math.min(h - 1, Math.ceil((o.z + hz - z0) / GRID))
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) cells[j * w + i] = 0
  }
  for (const region of enclosedRegions(objects))
    for (const c of region) {
      const i = Math.round((c.x + SEG / 2 - x0) / GRID)
      const j = Math.round((c.z + SEG / 2 - z0) / GRID)
      if (i >= 0 && j >= 0 && i < w && j < h) cells[j * w + i] = 0
    }
  chamfer(cells, w, h)
  for (let k = 0; k < cells.length; k++) cells[k] *= GRID // cells → metres

  // Past the grid: the bounding-box distance (the shape no longer matters there).
  const boxDistance = (x: number, z: number) =>
    Math.hypot(Math.max(b.x0 - x, 0, x - b.x1), Math.max(b.z0 - z, 0, z - b.z1))
  const soft = blur(cells, w, h)
  // Near the grid's edge, ease into the box distance (no seam in the land).
  const EASE = 6
  const distanceAt = (x: number, z: number) => {
    const fi = (x - x0) / GRID
    const fj = (z - z0) / GRID
    if (fi < 0 || fj < 0 || fi >= w - 1 || fj >= h - 1) return boxDistance(x, z)
    const i = Math.floor(fi)
    const j = Math.floor(fj)
    const tx = fi - i
    const tz = fj - j
    const top = soft[j * w + i] * (1 - tx) + soft[j * w + i + 1] * tx
    const bottom = soft[(j + 1) * w + i] * (1 - tx) + soft[(j + 1) * w + i + 1] * tx
    const d = top * (1 - tz) + bottom * tz
    const edge = Math.min(fi, fj, w - 1 - fi, h - 1 - fj) * GRID
    if (edge >= EASE) return d
    const t = edge / EASE
    const k = t * t * (3 - 2 * t) // smoothstep
    return boxDistance(x, z) * (1 - k) + d * k
  }

  const plateau = traceLoops(soft, w, h, x0, z0, PLATEAU_MARGIN).map((l) => smooth(l))
  return { distanceAt, plateau, grid: { cells, w, h, x0, z0 } }
}

/** One field per layout (the objects array is replaced on every change). */
const cache = new WeakMap<SceneObject[], StructureField | null>()
export const getStructureField = (objects: SceneObject[]) => {
  if (!cache.has(objects)) cache.set(objects, build(objects))
  return cache.get(objects) ?? null
}
