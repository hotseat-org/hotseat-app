import { isSeatable } from "../catalog"
import { edgeDirection, footprintCells, getCellKey, unitEdges, getEdge } from "~/editor/core"
import { GRID, type SceneObject } from "~/editor/core"

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
  for (const character of text) hash = (hash * 31 + character.charCodeAt(0)) >>> 0

  return hash
}

/**
 * The office's zones, by name, with their colours: each takes the colour its
 * name hashes to unless an earlier one (alphabetically) has it — so a zone
 * keeps its colour as others come and go, and few share one.
 */
export const getZones = (objects: SceneObject[]): Zone[] => {
  const counts = new Map<string, number>()
  for (const piece of objects)
    if (isSeatable(piece.type) && piece.zone)
      counts.set(piece.zone, (counts.get(piece.zone) ?? 0) + 1)
  const taken = new Set<number>()

  return [...counts.keys()]
    .sort((first, second) => first.localeCompare(second))
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
    for (let suffix = 2; prefix === "D" || [...prefixes.values()].includes(prefix); suffix++)
      prefix = `${letters.slice(0, length)}${suffix}`
    prefixes.set(zone, prefix)
  }
  const counters = new Map<string, number>()
  const labels = new Map(
    objects
      .filter((piece) => isSeatable(piece.type))
      .sort((first, second) => first.z - second.z || first.x - second.x)
      .map((piece) => {
        const prefix = (piece.zone && prefixes.get(piece.zone)) || "D"
        const number = (counters.get(prefix) ?? 0) + 1
        counters.set(prefix, number)

        return [piece.id, `${prefix}-${number}`]
      })
  )

  return objects.map((piece) =>
    labels.has(piece.id) ? { ...piece, label: labels.get(piece.id) } : piece
  )
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
  /**
   * Where its name is lettered on its floor: its most open square (furthest
   * from its desks), running along its longer side (`isAlongX`), at most
   * `maxWidth` long (m) — the run of its squares through that one.
   */
  floorLabel: { x: number; z: number; isAlongX: boolean; maxWidth: number }
  /** Its name at its edge: the middle of its back side (the one furthest from the default view). */
  edgeLabel: { x: number; z: number }
}

/**
 * The grid lines walls stand on, as the square sides they close: "x:i,j" is the
 * side along X under square (i, j) (z = j), "z:i,j" the side along Z left of it
 * (x = i). Doors and glass close them too: a zone stays in its room. (Diagonal
 * walls cross squares, not their sides, and don't close any.)
 */
const getClosedSides = (objects: SceneObject[]) => {
  const sides = new Set<string>()
  for (const piece of objects) {
    if (!getEdge(piece.type)?.encloses) continue

    const direction = edgeDirection(piece.rotation)
    if (direction !== "x" && direction !== "z") continue

    for (const edge of unitEdges(piece)) {
      const i = Math.round(edge.x / ZONE_CELL - (direction === "x" ? 0.5 : 0))
      const j = Math.round(edge.z / ZONE_CELL - (direction === "z" ? 0.5 : 0))
      sides.add(`${direction}:${getCellKey(i, j)}`)
    }
  }

  return sides
}

/** The four neighbours of a square, each with the side crossed to reach it. */
const getNeighbours = (i: number, j: number) =>
  [
    [i, j + 1, `x:${getCellKey(i, j + 1)}`],
    [i, j - 1, `x:${getCellKey(i, j)}`],
    [i + 1, j, `z:${getCellKey(i + 1, j)}`],
    [i - 1, j, `z:${getCellKey(i, j)}`],
  ] as const

interface Owner {
  zone?: string
  distance: number
  toMiddle: number
  cell: [number, number]
}

/**
 * Claim the squares round a desk, from under it out to its margin and never
 * through a wall: a square goes to the nearest desk.
 */
const claimSquares = (desk: SceneObject, closedSides: Set<string>, owners: Map<string, Owner>) => {
  const [cellsX, cellsZ] = footprintCells(desk.type, desk.rotation)
  const [minX, maxX] = [desk.x - (cellsX * GRID) / 2, desk.x + (cellsX * GRID) / 2]
  const [minZ, maxZ] = [desk.z - (cellsZ * GRID) / 2, desk.z + (cellsZ * GRID) / 2]
  const i0 = Math.floor((minX - ZONE_MARGIN) / ZONE_CELL + 1e-6)
  const i1 = Math.ceil((maxX + ZONE_MARGIN) / ZONE_CELL - 1e-6)
  const j0 = Math.floor((minZ - ZONE_MARGIN) / ZONE_CELL + 1e-6)
  const j1 = Math.ceil((maxZ + ZONE_MARGIN) / ZONE_CELL - 1e-6)
  /** From a square's middle to the desk's footprint (0: under it). */
  const distanceOf = (i: number, j: number) => {
    const centreX = (i + 0.5) * ZONE_CELL
    const centreZ = (j + 0.5) * ZONE_CELL

    return Math.hypot(
      Math.max(minX - centreX, 0, centreX - maxX),
      Math.max(minZ - centreZ, 0, centreZ - maxZ)
    )
  }
  // Spread from the squares under the desk (or, a small one, its middle's)
  // to its margin, never through a wall.
  const isInMargin = (i: number, j: number) => i >= i0 && i < i1 && j >= j0 && j < j1
  const under: [number, number][] = []
  for (let i = i0; i < i1; i++) {
    for (let j = j0; j < j1; j++) {
      if (distanceOf(i, j) === 0) under.push([i, j])
    }
  }
  if (under.length === 0)
    under.push([Math.floor(desk.x / ZONE_CELL), Math.floor(desk.z / ZONE_CELL)])

  const reached = new Set(under.map(([i, j]) => getCellKey(i, j)))
  const queue = [...under]
  while (queue.length > 0) {
    const [i, j] = queue.pop() as [number, number]
    // …equally near two desks: the one whose middle is nearer.
    const distance = distanceOf(i, j)
    const toMiddle = Math.hypot((i + 0.5) * ZONE_CELL - desk.x, (j + 0.5) * ZONE_CELL - desk.z)
    const key = getCellKey(i, j)
    const owner = owners.get(key)
    if (
      !owner ||
      distance < owner.distance ||
      (distance === owner.distance && toMiddle < owner.toMiddle)
    )
      owners.set(key, { zone: desk.zone, distance, toMiddle, cell: [i, j] })

    for (const [neighbourI, neighbourJ, side] of getNeighbours(i, j)) {
      const next = getCellKey(neighbourI, neighbourJ)
      if (reached.has(next) || !isInMargin(neighbourI, neighbourJ) || closedSides.has(side))
        continue

      reached.add(next)
      queue.push([neighbourI, neighbourJ])
    }
  }
}

/**
 * Each zone's floor: the squares within ZONE_MARGIN of its desks that can be
 * reached from the desk without crossing a wall. A square goes to the nearest
 * desk — any desk, so a zone never spreads under a desk outside it, and
 * neighbouring zones meet instead of overlapping.
 */
export const composeZoneAreas = (objects: SceneObject[]): ZoneArea[] => {
  const closedSides = getClosedSides(objects)
  const owners = new Map<string, Owner>()
  for (const desk of objects) {
    if (isSeatable(desk.type)) claimSquares(desk, closedSides, owners)
  }

  return getZones(objects).flatMap((zone) => {
    const cells = [...owners.values()]
      .filter((owner) => owner.zone === zone.name)
      .map((owner) => owner.cell)
    if (cells.length === 0) return [] // every square nearer another zone's desks

    const centreI = cells.reduce((sum, [i]) => sum + i, 0) / cells.length
    const centreJ = cells.reduce((sum, [, j]) => sum + j, 0) / cells.length
    const [labelI, labelJ] = cells.reduce((best, cell) =>
      Math.hypot(cell[0] - centreI, cell[1] - centreJ) <
      Math.hypot(best[0] - centreI, best[1] - centreJ)
        ? cell
        : best
    )

    return [
      {
        zone,
        cells,
        label: { x: (labelI + 0.5) * ZONE_CELL, z: (labelJ + 0.5) * ZONE_CELL },
        floorLabel: getFloorLabel(cells, zone.name, objects),
        edgeLabel: getEdgeLabel(cells),
      },
    ]
  })
}

/** Letters' height on a zone's floor (m), unless its floor is too short for its name. */
export const ZONE_LETTER_HEIGHT = 0.55

/** Pieces that don't stand on the floor in the way of a name: walls and what's on them, rugs. */
const NOT_IN_THE_WAY = new Set(["wall", "door", "window", "rug", "note", "wallTv", "whiteboard"])

/** A name's length on the floor (m), in spaced capitals ZONE_LETTER_HEIGHT high (about). */
const getNameLength = (name: string) => ZONE_LETTER_HEIGHT * (0.78 * name.length + 0.6)

interface Box {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

/** How much two boxes overlap (m²). */
const getOverlap = (first: Box, second: Box) =>
  Math.max(0, Math.min(first.maxX, second.maxX) - Math.max(first.minX, second.minX)) *
  Math.max(0, Math.min(first.maxZ, second.maxZ) - Math.max(first.minZ, second.minZ))

/** A piece's footprint on the floor. */
const boxOf = (piece: SceneObject): Box => {
  const [width, depth] = footprintCells(piece.type, piece.rotation)

  return {
    minX: piece.x - (width * GRID) / 2,
    maxX: piece.x + (width * GRID) / 2,
    minZ: piece.z - (depth * GRID) / 2,
    maxZ: piece.z + (depth * GRID) / 2,
  }
}

/**
 * Where a zone's name is lettered on its floor: a strip of its floor the
 * name's length (or its run of squares, if shorter) that the least furniture
 * stands on — along either side — the whole name fitting, then nearer its
 * middle, winning ties.
 */
const getFloorLabel = (
  cells: [number, number][],
  name: string,
  pieces: SceneObject[]
): ZoneArea["floorLabel"] => {
  const isOwn = new Set(cells.map(([i, j]) => `${i},${j}`))
  const obstacles = pieces.filter((piece) => !NOT_IN_THE_WAY.has(piece.type)).map(boxOf)
  const centreI = cells.reduce((sum, [i]) => sum + i, 0) / cells.length
  const centreJ = cells.reduce((sum, [, j]) => sum + j, 0) / cells.length
  const nameLength = getNameLength(name)
  const halfThickness = ZONE_LETTER_HEIGHT / 2 + 0.1

  const candidates = cells.flatMap(([i, j]) =>
    [true, false].map((isAlongX) => {
      const step = isAlongX ? [1, 0] : [0, 1]
      const runFrom = (direction: 1 | -1) => {
        let length = 0
        while (
          isOwn.has(
            `${i + step[0] * direction * (length + 1)},${j + step[1] * direction * (length + 1)}`
          )
        )
          length++

        return length
      }
      const before = runFrom(-1)
      const after = runFrom(1)
      const run = (before + after + 1) * ZONE_CELL
      const length = Math.min(nameLength, run * 0.9)
      // Centred on the square, kept inside its run of squares.
      const middle = { x: (i + 0.5) * ZONE_CELL, z: (j + 0.5) * ZONE_CELL }
      const centre = isAlongX ? middle.x : middle.z
      const runStart = centre - (before + 0.5) * ZONE_CELL
      const runEnd = centre + (after + 0.5) * ZONE_CELL
      const along = Math.min(Math.max(centre, runStart + length / 2), runEnd - length / 2)
      const x = isAlongX ? along : middle.x
      const z = isAlongX ? middle.z : along
      const box: Box = isAlongX
        ? {
            minX: x - length / 2,
            maxX: x + length / 2,
            minZ: z - halfThickness,
            maxZ: z + halfThickness,
          }
        : {
            minX: x - halfThickness,
            maxX: x + halfThickness,
            minZ: z - length / 2,
            maxZ: z + length / 2,
          }
      const blocked = obstacles.reduce((sum, obstacle) => sum + getOverlap(box, obstacle), 0)

      return {
        label: { x, z, isAlongX, maxWidth: run },
        blocked,
        isWhole: run * 0.9 >= nameLength,
        distance: Math.hypot(i - centreI, j - centreJ),
      }
    })
  )

  const best = candidates.reduce((chosen, candidate) => {
    const blockedBy = candidate.blocked - chosen.blocked
    if (Math.abs(blockedBy) > 0.01) return blockedBy < 0 ? candidate : chosen
    if (candidate.isWhole !== chosen.isWhole) return candidate.isWhole ? candidate : chosen

    return candidate.distance < chosen.distance ? candidate : chosen
  })

  return best.label
}

/** A zone's name at its edge: the middle of its back side (smallest z), just past it. */
const getEdgeLabel = (cells: [number, number][]): ZoneArea["edgeLabel"] => {
  const backRow = Math.min(...cells.map(([, j]) => j))
  const backCells = cells.filter(([, j]) => j === backRow).map(([i]) => i)
  const middle = (Math.min(...backCells) + Math.max(...backCells) + 1) / 2

  return { x: middle * ZONE_CELL, z: backRow * ZONE_CELL }
}

/** A unit edge of a zone's outline. */
type Edge = { from: [number, number]; to: [number, number] }

const getDirection = (edge: Edge): [number, number] => [
  edge.to[0] - edge.from[0],
  edge.to[1] - edge.from[1],
]

/**
 * Follow a loop from its first edge, keeping only the corners (where it turns).
 * `take` hands over the next edge from a point, preferring the left turn.
 */
const traceCorners = (
  first: Edge,
  take: (key: string, direction?: [number, number]) => Edge | null
) => {
  const corners: [number, number][] = []
  const firstDirection = getDirection(first)
  const isStart = (point: [number, number]) =>
    point[0] === first.from[0] && point[1] === first.from[1]
  let edge: Edge | null = first
  let direction = firstDirection
  while (edge && !isStart(edge.to)) {
    const next = take(getCellKey(...edge.to), direction)
    if (!next) break

    const nextDirection = getDirection(next)
    if (nextDirection[0] !== direction[0] || nextDirection[1] !== direction[1])
      corners.push(next.from)

    direction = nextDirection
    edge = next
  }
  // Back where it began: a corner there too, unless it carries straight on.
  if (direction[0] !== firstDirection[0] || direction[1] !== firstDirection[1])
    corners.push(first.from)

  return corners
}

/**
 * A zone's outline as an SVG path (plan units = metres, y = z): every loop
 * round its squares, each corner rounded — outer corners off, inner ones
 * filled in — as the 3D floor draws it. Holes wind the other way (nonzero).
 */
export const composeZoneOutline = (cells: [number, number][]): string => {
  const filled = new Set(cells.map(([i, j]) => getCellKey(i, j)))
  const has = (i: number, j: number) => filled.has(getCellKey(i, j))
  // Unit edges with the zone on their left, keyed by where they start.
  const starts = new Map<string, Edge[]>()
  const add = (from: [number, number], to: [number, number]) => {
    const key = getCellKey(...from)
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
    const turn = (candidate: Edge) => {
      if (!direction) return 0

      const delta = [candidate.to[0] - candidate.from[0], candidate.to[1] - candidate.from[1]]
      const cross = direction[0] * delta[1] - direction[1] * delta[0]

      if (cross > 0) return 0

      return cross === 0 ? 1 : 2
    }
    const edge = [...list].sort((first, second) => turn(first) - turn(second))[0]
    list.splice(list.indexOf(edge), 1)

    return edge
  }

  const radius = ZONE_RADIUS * ZONE_CELL
  const loops: string[] = []
  for (const key of starts.keys()) {
    for (let first = take(key); first; first = take(key)) {
      const corners = traceCorners(first, take)
      if (corners.length < 4) continue

      const at = (index: number) => corners[(index + corners.length) % corners.length]
      const parts = corners.map((corner, index) => {
        const [prevX, prevZ] = at(index - 1)
        const [nextX, nextZ] = at(index + 1)
        const incoming = [Math.sign(corner[0] - prevX), Math.sign(corner[1] - prevZ)]
        const outgoing = [Math.sign(nextX - corner[0]), Math.sign(nextZ - corner[1])]
        const [x, z] = [corner[0] * ZONE_CELL, corner[1] * ZONE_CELL]
        const sweep = incoming[0] * outgoing[1] - incoming[1] * outgoing[0] > 0 ? 1 : 0
        const enter = `${x - incoming[0] * radius} ${z - incoming[1] * radius}`
        const leave = `${x + outgoing[0] * radius} ${z + outgoing[1] * radius}`

        return `${index === 0 ? "M" : "L"}${enter}A${radius} ${radius} 0 0 ${sweep} ${leave}`
      })
      loops.push(`${parts.join("")}Z`)
    }
  }

  return loops.join("")
}
