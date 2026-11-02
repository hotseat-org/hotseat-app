import { ZONE_CELL, getClosedSides, getNeighbours, type ZoneArea } from "./zones"
import { footprintCells, GRID, type SceneObject } from "~/editor/core"

/**
 * Where zones' names are lettered on their floors (like districts on a map):
 * one height for the whole office — the largest most of its zones have room
 * for; a tight zone's only as much smaller as it must be — and a name only
 * where it fits whole, on floor nothing stands on: inside its
 * zone, or — a packed zone — reaching into the floor beside it that no zone
 * has (an aisle), never into another zone or through a wall. There the zone
 * takes that floor in, like a folder's tab: its outline goes round its name.
 * Inside, and along x, where it can be, so they read alike; nowhere rather
 * than cut off.
 */

/** Letters' heights to try (m), largest first. */
export const LETTER_HEIGHTS = [0.55, 0.47, 0.4, 0.32]
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
 * how much clear floor it has round it (m, up to MAX_ROOM).
 */
type Place = ZoneLetters & { ownShare: number; room: number }

/** Clear floor round a name counts up to this (m): past it, an aisle is an aisle. */
const MAX_ROOM = 1

/** Pieces that don't stand in a name's way: rugs, and what hangs on walls (the walls do). */
const NOT_IN_THE_WAY = new Set(["rug", "note", "wallTv", "whiteboard"])
/** Room kept between a name and what stands round it (m). */
const CLEARANCE = 0.06
/** The office's letters are the largest at least this share of its zones has room for. */
const MOST_ZONES = 0.6
/** At least this share of a name's floor is its zone's own: it stays by its zone. */
const MIN_OWN_SHARE = 0.35

interface Box {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

/** How far apart two boxes are (m; 0 touching or overlapping). */
const getGap = (first: Box, second: Box) =>
  Math.hypot(
    Math.max(0, first.minX - second.maxX, second.minX - first.maxX),
    Math.max(0, first.minZ - second.maxZ, second.minZ - first.maxZ)
  )

const isOverlapping = (first: Box, second: Box) =>
  first.minX < second.maxX &&
  second.minX < first.maxX &&
  first.minZ < second.maxZ &&
  second.minZ < first.maxZ

/** A piece's footprint on the floor, with room kept round it. */
const boxOf = (piece: SceneObject): Box => {
  const [width, depth] = footprintCells(piece.type, piece.rotation)

  return {
    minX: piece.x - (width * GRID) / 2 - CLEARANCE,
    maxX: piece.x + (width * GRID) / 2 + CLEARANCE,
    minZ: piece.z - (depth * GRID) / 2 - CLEARANCE,
    maxZ: piece.z + (depth * GRID) / 2 + CLEARANCE,
  }
}

/** A zone's squares' bounds, reaching `reach` (m) further all round. */
const boundsOf = (area: ZoneArea, reach: number): Box => ({
  minX: Math.min(...area.cells.map(([i]) => i)) * ZONE_CELL - reach,
  maxX: (Math.max(...area.cells.map(([i]) => i)) + 1) * ZONE_CELL + reach,
  minZ: Math.min(...area.cells.map(([, j]) => j)) * ZONE_CELL - reach,
  maxZ: (Math.max(...area.cells.map(([, j]) => j)) + 1) * ZONE_CELL + reach,
})

/**
 * Every place a zone's name fits whole at a height: clear, enough of it the
 * zone's, and the squares under it and the margin round it either the zone's
 * or no zone's (taken in) — with no wall across them.
 */
const findPlaces = ({
  area,
  aspect,
  height,
  obstacles,
  closedSides,
  zoneOf,
}: {
  area: ZoneArea
  /** Its name's width per metre of letter height. */
  aspect: number
  height: number
  /** What stands near it. */
  obstacles: Box[]
  /** The square sides walls close. */
  closedSides: Set<string>
  /** Every zone's squares: whose each is. */
  zoneOf: Map<string, string>
}): Place[] => {
  const width = height * aspect
  const getCells = (box: Box) => {
    const epsilon = 1e-6
    const cells: [number, number][] = []
    for (
      let i = Math.floor(box.minX / ZONE_CELL);
      i < Math.ceil(box.maxX / ZONE_CELL - epsilon);
      i++
    )
      for (
        let j = Math.floor(box.minZ / ZONE_CELL);
        j < Math.ceil(box.maxZ / ZONE_CELL - epsilon);
        j++
      )
        cells.push([i, j])

    return cells
  }
  // Whether a wall runs between any two of these squares.
  const isWalled = (cells: [number, number][]) => {
    const keys = new Set(cells.map((cell) => cell.join(",")))

    return cells.some(([i, j]) =>
      getNeighbours(i, j).some(
        ([nextI, nextJ, side]) => keys.has(`${nextI},${nextJ}`) && closedSides.has(side)
      )
    )
  }
  // Middles every half square over the zone (each once).
  const steps = new Map<string, [number, number]>()
  for (const [i, j] of area.cells)
    for (const step of [
      [i + 0.5, j + 0.5],
      [i + 1, j + 0.5],
      [i + 0.5, j + 1],
      [i + 1, j + 1],
    ] as [number, number][])
      steps.set(step.join(","), step)

  return [...steps.values()].flatMap(([i, j]) =>
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
      if (obstacles.some((obstacle) => isOverlapping(box, obstacle))) return []

      const under = getCells(box)
      const ownShare =
        under.filter(([i, j]) => zoneOf.get(`${i},${j}`) === area.zone.name).length / under.length
      if (ownShare < MIN_OWN_SHARE) return []

      // The squares the zone's outline has to go round: none another zone's, no wall across.
      const around = getCells({
        minX: box.minX - EDGE_MARGIN,
        maxX: box.maxX + EDGE_MARGIN,
        minZ: box.minZ - EDGE_MARGIN,
        maxZ: box.maxZ + EDGE_MARGIN,
      })
      const owners = around.map((cell) => zoneOf.get(cell.join(",")))
      if (owners.some((owner) => owner && owner !== area.zone.name)) return []
      if (isWalled(around)) return []

      const cells = around.filter((_, index) => !owners[index])

      const room = obstacles.reduce(
        (least, obstacle) => Math.min(least, getGap(box, obstacle)),
        MAX_ROOM
      )

      return [{ x, z, isAlongX, height, width, cells, ownShare, room }]
    })
  )
}

/**
 * The place to letter a name of all that fit: wholly inside its zone first,
 * then taking in the fewest squares beside it, along x, with the most clear
 * floor round it (an aisle, not between desks where people's tags float),
 * then nearest the zone's middle.
 */
const pickPlace = (area: ZoneArea, places: Place[]): ZoneLetters => {
  const centreX =
    (area.cells.reduce((sum, [i]) => sum + i, 0) / area.cells.length + 0.5) * ZONE_CELL
  const centreZ =
    (area.cells.reduce((sum, [, j]) => sum + j, 0) / area.cells.length + 0.5) * ZONE_CELL
  const score = (place: Place) =>
    (place.cells.length ? 10_000 + place.cells.length * 10 : 0) +
    (place.isAlongX ? 0 : 1000) -
    place.room * 100 +
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
  const obstacles = objects.filter((piece) => !NOT_IN_THE_WAY.has(piece.type)).map(boxOf)
  const closedSides = getClosedSides(objects)
  const zoneOf = new Map<string, string>(
    areas.flatMap((area) => area.cells.map(([i, j]) => [`${i},${j}`, area.zone.name] as const))
  )
  // Each zone checks only what stands within its bounds, and a name's reach past them.
  const nearby = new Map(
    areas.map((area) => {
      const bounds = boundsOf(area, LETTER_HEIGHTS[0] * getAspect(area.zone.name))

      return [area, obstacles.filter((obstacle) => isOverlapping(bounds, obstacle))]
    })
  )
  const placesAt = (area: ZoneArea, height: number) =>
    findPlaces({
      area,
      aspect: getAspect(area.zone.name),
      height,
      obstacles: nearby.get(area) ?? [],
      closedSides,
      zoneOf,
    })

  // Each zone's largest height that fits; the office's, the largest most of them fit.
  const fitting = new Map(
    areas.map((area) => [area, LETTER_HEIGHTS.find((height) => placesAt(area, height).length)])
  )
  const neededCount = Math.ceil(areas.length * MOST_ZONES)
  const officeHeight =
    LETTER_HEIGHTS.find(
      (height) =>
        [...fitting.values()].filter((fit) => fit !== undefined && fit >= height).length >=
        neededCount
    ) ?? LETTER_HEIGHTS[LETTER_HEIGHTS.length - 1]

  // That height — a tight zone, only as much smaller as it must. The squares
  // one takes in are its, then: a name after it doesn't take them too.
  const letters = new Map<string, ZoneLetters>()
  for (const area of areas) {
    const fit = fitting.get(area)
    if (fit === undefined) continue

    const places = LETTER_HEIGHTS.filter((height) => height <= Math.min(fit, officeHeight))
      .map((height) => placesAt(area, height))
      .find((found) => found.length)
    if (!places) continue

    const place = pickPlace(area, places)
    for (const cell of place.cells) zoneOf.set(cell.join(","), area.zone.name)

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
