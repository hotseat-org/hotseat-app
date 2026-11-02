import { ZONE_CELL, type ZoneArea } from "./zones"
import { footprintCells, GRID, type SceneObject } from "~/editor/core"

/**
 * Where zones' names are lettered on their floors (like districts on a map):
 * one height for the whole office — the largest most of its zones have room
 * for; a tight zone's only as much smaller as it must be — and a name only
 * where it fits whole, on floor nothing stands on: inside its
 * zone, or — a packed zone — reaching into the floor beside it that no zone
 * has (an aisle), never into another zone or through a wall. Inside, and
 * along x, where it can be, so they read alike; nowhere rather than cut off.
 */

/** Letters' heights to try (m), largest first. */
export const LETTER_HEIGHTS = [0.55, 0.47, 0.4, 0.32]

/** A name's width on the floor per metre of its letters' height (the lettering measures it). */
export type NameAspect = (name: string) => number

/** About right for spaced capitals, where nothing can measure them (the server, tests). */
export const estimateNameAspect: NameAspect = (name) => (0.86 * name.length + 0.5) / 1.3

/** A zone's name on its floor: its middle (m), its direction, and its size (m). */
export interface ZoneLetters {
  x: number
  z: number
  isAlongX: boolean
  height: number
  width: number
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

/** Every place a zone's name fits whole at a height: clear, and enough of it the zone's. */
const findPlaces = ({
  area,
  aspect,
  height,
  obstacles,
  zoneOf,
}: {
  area: ZoneArea
  /** Its name's width per metre of letter height. */
  aspect: number
  height: number
  /** What stands near it. */
  obstacles: Box[]
  /** Every zone's squares: whose each is. */
  zoneOf: Map<string, string>
}): Place[] => {
  const width = height * aspect
  // The share of a box's squares that are the zone's — none if any is another zone's.
  const getOwnShare = (box: Box) => {
    const epsilon = 1e-6
    let own = 0
    let count = 0
    for (
      let i = Math.floor(box.minX / ZONE_CELL);
      i < Math.ceil(box.maxX / ZONE_CELL - epsilon);
      i++
    )
      for (
        let j = Math.floor(box.minZ / ZONE_CELL);
        j < Math.ceil(box.maxZ / ZONE_CELL - epsilon);
        j++
      ) {
        const owner = zoneOf.get(`${i},${j}`)
        if (owner && owner !== area.zone.name) return 0
        if (owner) own++

        count++
      }

    return count ? own / count : 0
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
      const ownShare = getOwnShare(box)
      const isClear =
        ownShare >= MIN_OWN_SHARE && !obstacles.some((obstacle) => isOverlapping(box, obstacle))

      if (!isClear) return []

      const room = obstacles.reduce(
        (least, obstacle) => Math.min(least, getGap(box, obstacle)),
        MAX_ROOM
      )

      return [{ x, z, isAlongX, height, width, ownShare, room }]
    })
  )
}

/**
 * The place to letter a name of all that fit: wholly inside its zone first,
 * then along x, then with the most clear floor round it (an aisle, not
 * between desks where people's tags float), then nearest the zone's middle.
 */
const pickPlace = (area: ZoneArea, places: Place[]): ZoneLetters => {
  const centreX =
    (area.cells.reduce((sum, [i]) => sum + i, 0) / area.cells.length + 0.5) * ZONE_CELL
  const centreZ =
    (area.cells.reduce((sum, [, j]) => sum + j, 0) / area.cells.length + 0.5) * ZONE_CELL
  const score = (place: Place) =>
    (place.ownShare < 1 ? 10_000 : 0) +
    (place.isAlongX ? 0 : 1000) -
    place.room * 100 +
    Math.hypot(place.x - centreX, place.z - centreZ)
  const best = places.reduce((chosen, place) => (score(place) < score(chosen) ? place : chosen))

  return { x: best.x, z: best.z, isAlongX: best.isAlongX, height: best.height, width: best.width }
}

/** Where each zone's name is lettered (by its name); a zone with no room for it, none. */
export const placeZoneLetters = (
  areas: ZoneArea[],
  objects: SceneObject[],
  getAspect: NameAspect = estimateNameAspect
): Map<string, ZoneLetters> => {
  const obstacles = objects.filter((piece) => !NOT_IN_THE_WAY.has(piece.type)).map(boxOf)
  const zoneOf = new Map(
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

  // That height — a tight zone, only as much smaller as it must.
  const letters = new Map<string, ZoneLetters>()
  for (const area of areas) {
    const fit = fitting.get(area)
    if (fit === undefined) continue

    letters.set(area.zone.name, pickPlace(area, placesAt(area, Math.min(fit, officeHeight))))
  }

  return letters
}
