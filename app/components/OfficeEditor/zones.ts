import { edgeDirection, footprintCells, unitEdges } from "./layout"
import { GRID, isEdgeType, isSeatable, type SceneObject } from "./types"

/**
 * Zones (neighbourhoods): a team's part of the office — a name on its desks.
 * Each zone gets a colour of its own, its desks can be numbered after it
 * (ENG-1, ENG-2…), and people can filter the map down to it to book there.
 */

/** Distinct, soft colours that sit with the office palette. */
const ZONE_COLORS = [
  "#e07a5f",
  "#3d85c6",
  "#5fa37f",
  "#d4a03a",
  "#9b72cf",
  "#d9708a",
  "#2a9d8f",
  "#8d7b68",
]

export interface Zone {
  name: string
  color: string
  deskCount: number
}

const hashOf = (text: string) => {
  let hash = 0
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return hash
}

/**
 * The office's zones, by name, with their colours: each takes the colour its
 * name hashes to unless an earlier one (alphabetically) has it — so a zone
 * keeps its colour as others come and go, and few share one.
 */
export const getZones = (objects: SceneObject[]): Zone[] => {
  const counts = new Map<string, number>()
  for (const o of objects)
    if (isSeatable(o.type) && o.zone) counts.set(o.zone, (counts.get(o.zone) ?? 0) + 1)
  const taken = new Set<number>()
  return [...counts.keys()]
    .sort((a, b) => a.localeCompare(b))
    .map((name) => {
      let index = hashOf(name) % ZONE_COLORS.length
      for (let i = 0; i < ZONE_COLORS.length && taken.has(index); i++)
        index = (index + 1) % ZONE_COLORS.length
      taken.add(index)
      return { name, color: ZONE_COLORS[index], deskCount: counts.get(name) ?? 0 }
    })
}

/** A zone's desk-number prefix: its first letters, capitals, no accents ("Účetnictví" → "UCE"). */
const prefixOf = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()

/**
 * Every desk numbered again: a zone's desks after the zone (ENG-1, ENG-2…, a
 * longer prefix where two zones start alike), the rest D-1, D-2… — each back
 * to front, left to right.
 */
export const numberDesksByZone = (objects: SceneObject[]): SceneObject[] => {
  const zones = getZones(objects).map((z) => z.name)
  const prefixes = new Map<string, string>()
  for (const zone of zones) {
    const letters = prefixOf(zone) || "Z"
    let length = Math.min(3, letters.length)
    while (length < letters.length && [...prefixes.values()].includes(letters.slice(0, length)))
      length++
    let prefix = letters.slice(0, length)
    // Still taken (or "D", the unzoned desks'): number it.
    for (let n = 2; prefix === "D" || [...prefixes.values()].includes(prefix); n++)
      prefix = `${letters.slice(0, length)}${n}`
    prefixes.set(zone, prefix)
  }
  const counters = new Map<string, number>()
  const labels = new Map(
    objects
      .filter((o) => isSeatable(o.type))
      .sort((a, b) => a.z - b.z || a.x - b.x)
      .map((o) => {
        const prefix = (o.zone && prefixes.get(o.zone)) || "D"
        const n = (counters.get(prefix) ?? 0) + 1
        counters.set(prefix, n)
        return [o.id, `${prefix}-${n}`]
      })
  )
  return objects.map((o) => (labels.has(o.id) ? { ...o, label: labels.get(o.id) } : o))
}

/** The desk filter keeps zones as `zone:<name>` (features are plain ids). */
export const ZONE_FILTER_PREFIX = "zone:"

/** A zone's floor is drawn in grid squares: exactly under its desks, never under others'. */
export const ZONE_CELL = GRID
/** A zone's floor reaches this far (m) past its desks. */
const ZONE_MARGIN = 0.5
/** Rounded corners: radius in squares (the most a quarter of one allows). */
export const ZONE_RADIUS = 0.5

export interface ZoneArea {
  zone: Zone
  /** Its squares, as grid indices: square (i, j) spans [i, i+1] × [j, j+1] squares. */
  cells: [number, number][]
  /** Where its name goes: the middle of its square nearest its middle (m). */
  label: { x: number; z: number }
}

/**
 * The grid lines walls stand on, as the square sides they close: "x:i,j" is the
 * side along X under square (i, j) (z = j), "z:i,j" the side along Z left of it
 * (x = i). Doors and glass close them too: a zone stays in its room. (Diagonal
 * walls cross squares, not their sides, and don't close any.)
 */
const getClosedSides = (objects: SceneObject[]) => {
  const sides = new Set<string>()
  for (const o of objects) {
    if (!isEdgeType(o.type)) continue
    const direction = edgeDirection(o.rotation)
    if (direction !== "x" && direction !== "z") continue
    for (const e of unitEdges(o)) {
      const i = Math.round(e.x / ZONE_CELL - (direction === "x" ? 0.5 : 0))
      const j = Math.round(e.z / ZONE_CELL - (direction === "z" ? 0.5 : 0))
      sides.add(`${direction}:${i},${j}`)
    }
  }
  return sides
}

/** The four neighbours of a square, each with the side crossed to reach it. */
const getNeighbours = (i: number, j: number) =>
  [
    [i, j + 1, `x:${i},${j + 1}`],
    [i, j - 1, `x:${i},${j}`],
    [i + 1, j, `z:${i + 1},${j}`],
    [i - 1, j, `z:${i},${j}`],
  ] as const

/**
 * Each zone's floor: the squares within ZONE_MARGIN of its desks that can be
 * reached from the desk without crossing a wall. A square goes to the nearest
 * desk — any desk, so a zone never spreads under a desk outside it, and
 * neighbouring zones meet instead of overlapping.
 */
export const composeZoneAreas = (objects: SceneObject[]): ZoneArea[] => {
  const closedSides = getClosedSides(objects)
  const owners = new Map<
    string,
    { zone?: string; distance: number; toMiddle: number; cell: [number, number] }
  >()
  for (const desk of objects) {
    if (!isSeatable(desk.type)) continue
    const [w, d] = footprintCells(desk.type, desk.rotation)
    const [x0, x1] = [desk.x - (w * GRID) / 2, desk.x + (w * GRID) / 2]
    const [z0, z1] = [desk.z - (d * GRID) / 2, desk.z + (d * GRID) / 2]
    const i0 = Math.floor((x0 - ZONE_MARGIN) / ZONE_CELL + 1e-6)
    const i1 = Math.ceil((x1 + ZONE_MARGIN) / ZONE_CELL - 1e-6)
    const j0 = Math.floor((z0 - ZONE_MARGIN) / ZONE_CELL + 1e-6)
    const j1 = Math.ceil((z1 + ZONE_MARGIN) / ZONE_CELL - 1e-6)
    /** From a square's middle to the desk's footprint (0: under it). */
    const distanceOf = (i: number, j: number) => {
      const cx = (i + 0.5) * ZONE_CELL
      const cz = (j + 0.5) * ZONE_CELL
      return Math.hypot(Math.max(x0 - cx, 0, cx - x1), Math.max(z0 - cz, 0, cz - z1))
    }
    // Spread from the squares under the desk (or, a small one, its middle's)
    // to its margin, never through a wall.
    const isInMargin = (i: number, j: number) => i >= i0 && i < i1 && j >= j0 && j < j1
    const under: [number, number][] = []
    for (let i = i0; i < i1; i++)
      for (let j = j0; j < j1; j++) if (distanceOf(i, j) === 0) under.push([i, j])
    if (under.length === 0)
      under.push([Math.floor(desk.x / ZONE_CELL), Math.floor(desk.z / ZONE_CELL)])
    const reached = new Set(under.map(([i, j]) => `${i},${j}`))
    const queue = [...under]
    while (queue.length > 0) {
      const [i, j] = queue.pop() as [number, number]
      // …equally near two desks: the one whose middle is nearer.
      const distance = distanceOf(i, j)
      const toMiddle = Math.hypot((i + 0.5) * ZONE_CELL - desk.x, (j + 0.5) * ZONE_CELL - desk.z)
      const key = `${i},${j}`
      const owner = owners.get(key)
      if (
        !owner ||
        distance < owner.distance ||
        (distance === owner.distance && toMiddle < owner.toMiddle)
      )
        owners.set(key, { zone: desk.zone, distance, toMiddle, cell: [i, j] })
      for (const [ni, nj, side] of getNeighbours(i, j)) {
        const next = `${ni},${nj}`
        if (reached.has(next) || !isInMargin(ni, nj) || closedSides.has(side)) continue
        reached.add(next)
        queue.push([ni, nj])
      }
    }
  }
  return getZones(objects).flatMap((zone) => {
    const cells = [...owners.values()].filter((o) => o.zone === zone.name).map((o) => o.cell)
    if (cells.length === 0) return [] // every square nearer another zone's desks
    const ci = cells.reduce((sum, [i]) => sum + i, 0) / cells.length
    const cj = cells.reduce((sum, [, j]) => sum + j, 0) / cells.length
    const [li, lj] = cells.reduce((best, c) =>
      Math.hypot(c[0] - ci, c[1] - cj) < Math.hypot(best[0] - ci, best[1] - cj) ? c : best
    )
    return [{ zone, cells, label: { x: (li + 0.5) * ZONE_CELL, z: (lj + 0.5) * ZONE_CELL } }]
  })
}

/**
 * A zone's outline as an SVG path (plan units = metres, y = z): every loop
 * round its squares, each corner rounded — outer corners off, inner ones
 * filled in — as the 3D floor draws it. Holes wind the other way (nonzero).
 */
export const composeZoneOutline = (cells: [number, number][]): string => {
  const filled = new Set(cells.map(([i, j]) => `${i},${j}`))
  const has = (i: number, j: number) => filled.has(`${i},${j}`)
  // Unit edges with the zone on their left, keyed by where they start.
  type Edge = { from: [number, number]; to: [number, number] }
  const starts = new Map<string, Edge[]>()
  const add = (from: [number, number], to: [number, number]) => {
    const key = `${from[0]},${from[1]}`
    starts.set(key, [...(starts.get(key) ?? []), { from, to }])
  }
  for (const [i, j] of cells) {
    if (!has(i, j - 1)) add([i, j], [i + 1, j])
    if (!has(i + 1, j)) add([i + 1, j], [i + 1, j + 1])
    if (!has(i, j + 1)) add([i + 1, j + 1], [i, j + 1])
    if (!has(i - 1, j)) add([i, j + 1], [i, j])
  }
  const take = (key: string, direction?: [number, number]) => {
    const list = starts.get(key)
    if (!list?.length) return null
    // Where two squares touch only at a corner: turn left, staying with the
    // square we're going round, so each keeps its own rounded corner.
    const turn = (e: Edge) => {
      if (!direction) return 0
      const d = [e.to[0] - e.from[0], e.to[1] - e.from[1]]
      const cross = direction[0] * d[1] - direction[1] * d[0]
      return cross > 0 ? 0 : cross === 0 ? 1 : 2
    }
    const edge = [...list].sort((a, b) => turn(a) - turn(b))[0]
    list.splice(list.indexOf(edge), 1)
    return edge
  }

  const r = ZONE_RADIUS * ZONE_CELL
  const loops: string[] = []
  for (const key of starts.keys()) {
    for (let first = take(key); first; first = take(key)) {
      // Follow the loop, keeping only the corners (where it turns).
      const corners: [number, number][] = []
      let edge: Edge | null = first
      const firstDirection: [number, number] = [
        first.to[0] - first.from[0],
        first.to[1] - first.from[1],
      ]
      let direction = firstDirection
      const isStart = (p: [number, number]) => p[0] === first.from[0] && p[1] === first.from[1]
      while (edge && !isStart(edge.to)) {
        const next = take(`${edge.to[0]},${edge.to[1]}`, direction)
        if (!next) break
        const nextDirection: [number, number] = [
          next.to[0] - next.from[0],
          next.to[1] - next.from[1],
        ]
        if (nextDirection[0] !== direction[0] || nextDirection[1] !== direction[1])
          corners.push(next.from)
        direction = nextDirection
        edge = next
      }
      // Back where it began: a corner there too, unless it carries straight on.
      if (direction[0] !== firstDirection[0] || direction[1] !== firstDirection[1])
        corners.push(first.from)
      if (corners.length < 4) continue
      const at = (k: number) => corners[(k + corners.length) % corners.length]
      const parts = corners.map((corner, k) => {
        const [px, pz] = at(k - 1)
        const [nx, nz] = at(k + 1)
        const a = [Math.sign(corner[0] - px), Math.sign(corner[1] - pz)]
        const b = [Math.sign(nx - corner[0]), Math.sign(nz - corner[1])]
        const [x, z] = [corner[0] * ZONE_CELL, corner[1] * ZONE_CELL]
        const sweep = a[0] * b[1] - a[1] * b[0] > 0 ? 1 : 0
        const enter = `${x - a[0] * r} ${z - a[1] * r}`
        const leave = `${x + b[0] * r} ${z + b[1] * r}`
        return `${k === 0 ? "M" : "L"}${enter}A${r} ${r} 0 0 ${sweep} ${leave}`
      })
      loops.push(`${parts.join("")}Z`)
    }
  }
  return loops.join("")
}
