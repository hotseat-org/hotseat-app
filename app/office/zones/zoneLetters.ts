import { ZONE_CELL, getClosedSides, getNeighbours, type ZoneArea } from "./zones"
import { footprintCells, getEdge, GRID, type SceneObject } from "~/editor/core"

/**
 * Where zones' names are lettered on their floors (like districts on a map):
 * one height for the whole office — the largest all its zones have room for —
 * and a name only where it fits whole, on floor nothing stands on, by its
 * zone: inside it, or in the aisle just beside it (never in another zone or
 * across a wall), which the zone then takes in like a folder's tab, its
 * outline going round the name. Either way round, in the open where it can
 * be; nowhere rather than cut off.
 */

/** Letters' heights to try (m), largest first. */
export const LETTER_HEIGHTS = [0.5, 0.42, 0.36]
/** Room kept between a name and its zone's edge (m): clear of the outline drawn inside it. */
const EDGE_MARGIN = 0.15

/** A name's width on the floor per metre of its letters' height (the lettering measures it). */
export type NameAspect = (name: string) => number

/** About right for spaced capitals, where nothing can measure them (the server, tests). */
export const estimateNameAspect: NameAspect = (name) => (0.86 * name.length + 0.5) / 1.3

/**
 * A zone's name on its floor: its middle (m), its direction, its size (m),
 * and the squares beside the zone it takes in (none, when it fits inside).
 */
export interface ZoneLetters {
  x: number
  z: number
  isAlongX: boolean
  height: number
  width: number
  cells: [number, number][]
}

/**
 * A place a name fits: how much of its floor is its zone's own (0–1), and
 * how much clear floor it has round it (m, up to ROOM_STEPS' last).
 */
type Place = ZoneLetters & { room: number }

/** A place's score: a metre of clear floor round it is worth this many tab squares. */
const ROOM_WEIGHT = 200
const TAB_WEIGHT = 40

/** Pieces that don't stand in a name's way: rugs, and what hangs on walls (the walls do). */
const NOT_IN_THE_WAY = new Set(["rug", "note", "wallTv", "whiteboard"])
/** Room kept between a name and what stands round it (m). */
const CLEARANCE = 0.06
const WALL_CLEARANCE = 0.4
/**
 * A name's tab is at most this share of its zone's own floor (a tab, not a
 * second zone) — a small zone's, at least MIN_TAB squares: room for its name.
 */
const MAX_TAB_SHARE = 0.6
const MIN_TAB = 16
/** A name beside its zone is looked for this far (in squares) past its edge: an aisle along it. */
const AISLE_REACH = 1

interface Box {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

/**
 * A piece's footprint on the floor, with room kept round it — more round a
 * wall: from the tilted view, a wall's height hides the floor just behind it.
 */
const boxOf = (piece: SceneObject): Box => {
  const [width, depth] = footprintCells(piece.type, piece.rotation)
  const clearance = getEdge(piece.type)?.encloses ? WALL_CLEARANCE : CLEARANCE

  return {
    minX: piece.x - (width * GRID) / 2 - clearance,
    maxX: piece.x + (width * GRID) / 2 + clearance,
    minZ: piece.z - (depth * GRID) / 2 - clearance,
    maxZ: piece.z + (depth * GRID) / 2 + clearance,
  }
}

/** The squares (i, j) a box covers. */
const getCells = (box: Box) => {
  const epsilon = 1e-6
  const cells: [number, number][] = []
  for (let i = Math.floor(box.minX / ZONE_CELL); i < Math.ceil(box.maxX / ZONE_CELL - epsilon); i++)
    for (
      let j = Math.floor(box.minZ / ZONE_CELL);
      j < Math.ceil(box.maxZ / ZONE_CELL - epsilon);
      j++
    )
      cells.push([i, j])

  return cells
}

/** A square's key in the maps below: a number, quicker than text. */
const getKey = (i: number, j: number) => (i + 32_768) * 65_536 + (j + 32_768)

/**
 * A tab reaches over this far (m) to its zone, from a name a little off it,
 * in one of four directions: [x, z] towards the zone.
 */
const BRIDGES = [0.5].flatMap((reach): [number, number][] => [
  [-reach, 0],
  [reach, 0],
  [0, -reach],
  [0, reach],
])

/** A box reaching further one way: [x, z] (m; negative, towards −x or −z). */
const reachBox = (box: Box, [x, z]: [number, number]): Box => ({
  minX: box.minX + Math.min(0, x),
  maxX: box.maxX + Math.max(0, x),
  minZ: box.minZ + Math.min(0, z),
  maxZ: box.maxZ + Math.max(0, z),
})

const growBox = (box: Box, by: number): Box => ({
  minX: box.minX - by,
  maxX: box.maxX + by,
  minZ: box.minZ - by,
  maxZ: box.maxZ + by,
})

/** The floor grid's squares (m): fine enough for a name to fit between desks. */
const FINE = 0.1
/** Clear floor round a name, tried out to MAX_ROOM (m). */
const ROOM_STEPS = [0.1, 0.2, 0.4, 0.6, 0.8, 1, 1.2]
/** A name with this much clear floor round it (m) reads in the open, not squeezed between pieces. */
const MIN_ROOM = 0.2

/**
 * Where something stands, on a fine grid of the floor, as running totals (a
 * summed-area table): whether a box is clear is four lookups, however much
 * stands in the office.
 */
const createFloorGrid = (obstacles: Box[]) => {
  if (obstacles.length === 0)
    return { isClear: () => true, getRoom: () => ROOM_STEPS[ROOM_STEPS.length - 1] }

  const minX = Math.min(...obstacles.map((obstacle) => obstacle.minX))
  const minZ = Math.min(...obstacles.map((obstacle) => obstacle.minZ))
  const columns = Math.ceil((Math.max(...obstacles.map((obstacle) => obstacle.maxX)) - minX) / FINE)
  const rows = Math.ceil((Math.max(...obstacles.map((obstacle) => obstacle.maxZ)) - minZ) / FINE)
  const toColumn = (x: number) => Math.min(columns, Math.max(0, (x - minX) / FINE))
  const toRow = (z: number) => Math.min(rows, Math.max(0, (z - minZ) / FINE))
  // Taken squares, then each one's count of those up to and including it.
  const totals = new Int32Array((columns + 1) * (rows + 1))
  const at = (column: number, row: number) => row * (columns + 1) + column
  for (const obstacle of obstacles)
    for (let row = Math.floor(toRow(obstacle.minZ)); row < Math.ceil(toRow(obstacle.maxZ)); row++)
      for (
        let column = Math.floor(toColumn(obstacle.minX));
        column < Math.ceil(toColumn(obstacle.maxX));
        column++
      )
        totals[at(column + 1, row + 1)] = 1
  for (let row = 1; row <= rows; row++)
    for (let column = 1; column <= columns; column++)
      totals[at(column, row)] +=
        totals[at(column - 1, row)] + totals[at(column, row - 1)] - totals[at(column - 1, row - 1)]

  const isClear = (box: Box) => {
    const first = Math.floor(toColumn(box.minX))
    const last = Math.ceil(toColumn(box.maxX))
    const top = Math.floor(toRow(box.minZ))
    const bottom = Math.ceil(toRow(box.maxZ))
    if (first >= last || top >= bottom) return true

    return (
      totals[at(last, bottom)] -
        totals[at(first, bottom)] -
        totals[at(last, top)] +
        totals[at(first, top)] ===
      0
    )
  }
  // How much clear floor is round a box (m, up to ROOM_STEPS' last).
  const getRoom = (box: Box) => {
    let room = 0
    for (const step of ROOM_STEPS) {
      if (!isClear(growBox(box, step))) break

      room = step
    }

    return room
  }

  return { isClear, getRoom }
}

/** Middles every half square over a zone's bounds and the aisles round it (in squares). */
const getSteps = (area: ZoneArea) => {
  const minI = Math.min(...area.cells.map(([i]) => i)) - AISLE_REACH
  const maxI = Math.max(...area.cells.map(([i]) => i)) + 1 + AISLE_REACH
  const minJ = Math.min(...area.cells.map(([, j]) => j)) - AISLE_REACH
  const maxJ = Math.max(...area.cells.map(([, j]) => j)) + 1 + AISLE_REACH
  const steps: [number, number][] = []
  for (let i = minI; i <= maxI; i += 0.5) for (let j = minJ; j <= maxJ; j += 0.5) steps.push([i, j])

  return steps
}

/** The squares beside a closed side (by getKey): a wall may run between them and a neighbour. */
const getWalledCells = (closedSides: Set<string>) => {
  const cells = new Set<number>()
  for (const side of closedSides) {
    const [direction, place] = side.split(":")
    const [i, j] = place.split(",").map(Number)
    cells.add(getKey(i, j))
    // "x:i,j" closes (i, j) from (i, j − 1); "z:i,j", from (i − 1, j).
    cells.add(direction === "x" ? getKey(i, j - 1) : getKey(i - 1, j))
  }

  return cells
}

/**
 * Every place a zone's name fits whole at a height: clear, and the squares
 * under it and the margin round it the zone's (some) or no zone's (taken
 * in) — with no wall across them.
 */
const findPlaces = ({
  area,
  steps,
  aspect,
  height,
  floor,
  closedSides,
  walledCells,
  zoneOf,
}: {
  area: ZoneArea
  /** Where to try its middle (in squares). */
  steps: [number, number][]
  /** Its name's width per metre of letter height. */
  aspect: number
  height: number
  floor: ReturnType<typeof createFloorGrid>
  /** The square sides walls close. */
  closedSides: Set<string>
  /** The squares beside them. */
  walledCells: Set<number>
  /** Every zone's squares (by getKey): whose each is. */
  zoneOf: Map<number, string>
}): Place[] => {
  const width = height * aspect
  // Whether a wall runs between any two of these squares.
  const isWalled = (cells: [number, number][]) => {
    // Far from walls (most places), nothing to look for.
    if (!cells.some(([i, j]) => walledCells.has(getKey(i, j)))) return false

    const keys = new Set(cells.map((cell) => cell.join(",")))

    return cells.some(([i, j]) =>
      getNeighbours(i, j).some(
        ([nextI, nextJ, side]) => keys.has(`${nextI},${nextJ}`) && closedSides.has(side)
      )
    )
  }

  // The squares a zone's outline has to go round, to take in a box: some the
  // zone's (the tab joins it — else it's "apart"), none another zone's, no
  // wall across, not too many.
  const getTab = (box: Box): [number, number][] | "apart" | undefined => {
    const around = getCells(box)
    const owners = around.map(([i, j]) => zoneOf.get(getKey(i, j)))
    if (!owners.includes(area.zone.name)) return "apart"
    if (owners.some((owner) => owner && owner !== area.zone.name)) return undefined

    const cells = around.filter((_, index) => !owners[index])
    if (cells.length > Math.max(MIN_TAB, area.cells.length * MAX_TAB_SHARE)) return undefined
    if (isWalled(around)) return undefined

    return cells
  }
  // A name a little off its zone: the smallest tab reaching over to it.
  const getBridgedTab = (margin: Box) => {
    let smallest: [number, number][] | undefined
    for (const bridge of BRIDGES) {
      const tab = getTab(reachBox(margin, bridge))
      if (Array.isArray(tab) && (!smallest || tab.length < smallest.length)) smallest = tab
    }

    return smallest
  }

  return steps.flatMap(([i, j]) =>
    [true, false].flatMap((isAlongX) => {
      const x = i * ZONE_CELL
      const z = j * ZONE_CELL
      const [across, deep] = isAlongX ? [width, height] : [height, width]
      const box = {
        minX: x - across / 2,
        maxX: x + across / 2,
        minZ: z - deep / 2,
        maxZ: z + deep / 2,
      }
      if (!floor.isClear(box)) return []

      // Its tab: round it, or — a little off its zone — reaching over to it.
      const margin = growBox(box, EDGE_MARGIN)
      const tab = getTab(margin)
      const cells = tab === "apart" ? getBridgedTab(margin) : tab
      if (!cells) return []

      const room = floor.getRoom(box)

      return [{ x, z, isAlongX, height, width, cells, room }]
    })
  )
}

/**
 * The place to letter a name of all that fit: along x first; then on the
 * most open floor (an aisle, not between desks where people's tags float, or
 * by a table its top hides it under from the tilted view), taking in few
 * squares beside its zone, and near its middle.
 */
const pickPlace = (area: ZoneArea, places: Place[]): ZoneLetters => {
  const centreX =
    (area.cells.reduce((sum, [i]) => sum + i, 0) / area.cells.length + 0.5) * ZONE_CELL
  const centreZ =
    (area.cells.reduce((sum, [, j]) => sum + j, 0) / area.cells.length + 0.5) * ZONE_CELL
  const score = (place: Place) =>
    (place.isAlongX ? 0 : 5) -
    place.room * ROOM_WEIGHT +
    place.cells.length * TAB_WEIGHT +
    Math.hypot(place.x - centreX, place.z - centreZ)
  const best = places.reduce((chosen, place) => (score(place) < score(chosen) ? place : chosen))

  return {
    x: best.x,
    z: best.z,
    isAlongX: best.isAlongX,
    height: best.height,
    width: best.width,
    cells: best.cells,
  }
}

/** Where each zone's name is lettered (by its name); a zone with no room for it, none. */
export const placeZoneLetters = (
  areas: ZoneArea[],
  objects: SceneObject[],
  getAspect: NameAspect = estimateNameAspect
): Map<string, ZoneLetters> => {
  const floor = createFloorGrid(
    objects.filter((piece) => !NOT_IN_THE_WAY.has(piece.type)).map(boxOf)
  )
  const closedSides = getClosedSides(objects)
  const walledCells = getWalledCells(closedSides)
  const zoneOf = new Map<number, string>(
    areas.flatMap((area) => area.cells.map(([i, j]) => [getKey(i, j), area.zone.name] as const))
  )
  const stepsOf = new Map(areas.map((area) => [area, getSteps(area)]))
  const placesAt = (area: ZoneArea, height: number) =>
    findPlaces({
      area,
      steps: stepsOf.get(area) ?? [],
      aspect: getAspect(area.zone.name),
      height,
      floor,
      closedSides,
      walledCells,
      zoneOf,
    })

  // Each zone's largest height that fits; the office's, the largest all of them fit.
  const placesOf = new Map<ZoneArea, Map<number, Place[]>>()
  const getPlaces = (area: ZoneArea, height: number) => {
    const known = placesOf.get(area) ?? new Map<number, Place[]>()
    placesOf.set(area, known)
    const places = known.get(height) ?? placesAt(area, height)
    known.set(height, places)

    return places
  }
  const fitting = new Map(
    areas.map((area) => [area, LETTER_HEIGHTS.find((height) => getPlaces(area, height).length)])
  )
  const officeHeight = Math.min(
    ...[...fitting.values()].filter((fit) => fit !== undefined),
    LETTER_HEIGHTS[0]
  )

  // That height — smaller only where a name before it took the floor it
  // needed — in the open where it can be. The squares one takes in are its, then: a name
  // after it doesn't take them too (its places are looked for again).
  const letters = new Map<string, ZoneLetters>()
  for (const area of areas) {
    const fit = fitting.get(area)
    if (fit === undefined) continue

    // Before any tab's taken, the places looked for already hold.
    const find = letters.size ? placesAt : getPlaces
    const places = LETTER_HEIGHTS.filter((height) => height <= Math.min(fit, officeHeight))
      .map((height) => find(area, height))
      .find((found) => found.length)
    if (!places) continue

    const roomy = places.filter((place) => place.room >= MIN_ROOM)

    const place = pickPlace(area, roomy.length ? roomy : places)
    for (const [i, j] of place.cells) zoneOf.set(getKey(i, j), area.zone.name)

    letters.set(area.zone.name, place)
  }

  return letters
}

/** Zones with their names placed: each taking in the squares its name needs beside it. */
export const composeLetteredZones = (
  areas: ZoneArea[],
  objects: SceneObject[],
  getAspect: NameAspect = estimateNameAspect
) => {
  const letters = placeZoneLetters(areas, objects, getAspect)

  return {
    areas: areas.map((area) => {
      const cells = letters.get(area.zone.name)?.cells ?? []

      return cells.length ? { ...area, cells: [...area.cells, ...cells] } : area
    }),
    letters,
  }
}
