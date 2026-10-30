import { useMemo, useRef } from "react"
import { useEditorStore } from "./store"
import { getStructureField, PLATEAU_MARGIN } from "./structureField"
import type { SceneObject } from "./types"

/**
 * The ground round the office as an endless, abstract contour map: the office
 * stands on a flat plateau that falls away in gentle slopes to a rolling plain
 * dotted with hills, as far as you pan. Lines are drawn where a smooth height
 * field crosses whole levels (marching squares), so they never cross — it
 * reads like a real topographic map. Traced in square tiles on demand (shared
 * grid, so tiles join seamlessly). World metres, used by the 2D plan and the
 * 3D ground alike, so both show the same land.
 */
export interface ContourTile {
  /** Ordinary contours, as line segments: x0, z0, x1, z1, … */
  minor: Float32Array
  /** Every fourth contour (the heavier "index" lines). */
  major: Float32Array
  /** A sprinkle of stars for the night: x, z, brightness (0–1), … */
  stars: Float32Array
}

export interface Landscape {
  /** The flat top the office stands on — it hugs the walls and pieces — as
   *  closed outlines of [x, z] points (holes included). */
  plateau: [number, number][][]
  /** The contours of one tile (cached): tile (tx, tz) spans TILE metres from tx·TILE, tz·TILE. */
  tile: (tileX: number, tileZ: number) => ContourTile
}

/** Tile edge (m) — a whole number of grid cells. */
export const TILE = 32
/** Grid cell for tracing the lines (m): small enough for smooth curves. */
const CELL = 0.8
/** Stars tried per tile (some land too near the office and are dropped). */
const STARS_PER_TILE = 14
/** Stars keep this far off the plateau (m), so the office stands clear. */
const STAR_CLEARANCE = 3
/** How much the land falls from the plateau to the plain. */
const DROP = 14
/** How quickly it falls (m): the slope is steepest at the plateau's edge. */
const FALLOFF = 16
/** One hill (at most) per square of this size (m), placed by a hash. */
const HILL_CELL = 40
/** No hills this close to the plateau (m): the office keeps its view. */
const HILL_CLEARANCE = 14

/** A stable 0..1 number for an integer pair (and a seed). */
const hash = (first: number, second: number, seed: number) => {
  let bits =
    Math.imul(first, 374761393) ^ Math.imul(second, 668265263) ^ Math.imul(seed, 2246822519)
  bits = Math.imul(bits ^ (bits >>> 13), 1274126177)
  bits ^= bits >>> 16

  return (bits >>> 0) / 4294967296
}

/** With nothing built: a small rounded plateau at the starting point. */
const EMPTY = { halfX: 6, halfZ: 4, radius: 1.5 }
const emptyDistance = (x: number, z: number) => {
  const offsetX = Math.abs(x) - (EMPTY.halfX - EMPTY.radius)
  const offsetZ = Math.abs(z) - (EMPTY.halfZ - EMPTY.radius)
  const distance =
    Math.hypot(Math.max(offsetX, 0), Math.max(offsetZ, 0)) + Math.min(Math.max(offsetX, offsetZ), 0)

  return Math.max(0, distance - EMPTY.radius + PLATEAU_MARGIN)
}
const emptyPlateau = (): [number, number][][] => {
  const { halfX: halfX, halfZ: halfZ, radius: radius } = EMPTY
  const loop: [number, number][] = []
  const corners: [number, number, number][] = [
    [halfX - radius, halfZ - radius, 0],
    [-(halfX - radius), halfZ - radius, 90],
    [-(halfX - radius), -(halfZ - radius), 180],
    [halfX - radius, -(halfZ - radius), 270],
  ]
  for (const [centreX, centreZ, start] of corners)
    for (let angle = start; angle <= start + 90; angle += 15) {
      const radians = (angle * Math.PI) / 180
      loop.push([centreX + Math.cos(radians) * radius, centreZ + Math.sin(radians) * radius])
    }

  return [loop]
}

/**
 * Join loose segments (x0, z0, x1, z1, …) into continuous lines and round them
 * (Chaikin corner cutting), so contours read as smooth curves, not short
 * straight pieces. Ends at a tile's edge stay put, so tiles still meet.
 */
const smoothSegments = (flat: number[]) => {
  const key = (x: number, z: number) => `${x.toFixed(4)},${z.toFixed(4)}`
  const count = flat.length / 4
  const ends = new Map<string, number[]>() // point → segments touching it
  for (let segment = 0; segment < count; segment++)
    for (const endOffset of [0, 2]) {
      const point = key(flat[segment * 4 + endOffset], flat[segment * 4 + endOffset + 1])
      const list = ends.get(point)
      if (list) list.push(segment)
      else ends.set(point, [segment])
    }
  const used = new Uint8Array(count)
  const walk = (startSegment: number, fromEnd: number) => {
    // Start at segment s0's `fromEnd` (0 or 2) and follow the chain.
    const line: number[] = [flat[startSegment * 4 + fromEnd], flat[startSegment * 4 + fromEnd + 1]]
    let segment = startSegment
    let at = fromEnd === 0 ? 2 : 0
    for (;;) {
      used[segment] = 1
      const x = flat[segment * 4 + at]
      const z = flat[segment * 4 + at + 1]
      line.push(x, z)
      const next = (ends.get(key(x, z)) ?? []).find((candidate) => !used[candidate])
      if (next === undefined) break

      at = key(flat[next * 4], flat[next * 4 + 1]) === key(x, z) ? 2 : 0
      segment = next
    }

    return line
  }
  const lines: { points: number[]; closed: boolean }[] = []
  // Open lines first (they start where only one segment ends), then rings.
  for (const [, list] of ends)
    if (list.length === 1 && !used[list[0]]) {
      const segment = list[0]
      const startPoint = key(flat[segment * 4], flat[segment * 4 + 1])
      lines.push({
        points: walk(segment, (ends.get(startPoint)?.length ?? 0) === 1 ? 0 : 2),
        closed: false,
      })
    }
  for (let segment = 0; segment < count; segment++)
    if (!used[segment]) lines.push({ points: walk(segment, 0), closed: true })

  const out: number[] = []
  for (const { points: points, closed } of lines) {
    let smoothed = points
    for (let pass = 0; pass < 2; pass++) {
      const pointCount = smoothed.length / 2
      if (pointCount < 3) break

      const refined: number[] = closed ? [] : [smoothed[0], smoothed[1]]
      const last = closed ? pointCount : pointCount - 1
      for (let i = 0; i < last; i++) {
        const fromX = smoothed[i * 2]
        const fromZ = smoothed[i * 2 + 1]
        const toX = smoothed[((i + 1) % pointCount) * 2]
        const toZ = smoothed[((i + 1) % pointCount) * 2 + 1]
        refined.push(
          0.75 * fromX + 0.25 * toX,
          0.75 * fromZ + 0.25 * toZ,
          0.25 * fromX + 0.75 * toX,
          0.25 * fromZ + 0.75 * toZ
        )
      }
      if (!closed) refined.push(smoothed[(pointCount - 1) * 2], smoothed[(pointCount - 1) * 2 + 1])

      smoothed = refined
    }
    const pointCount = smoothed.length / 2
    for (let i = 0; i < pointCount - 1; i++)
      out.push(smoothed[i * 2], smoothed[i * 2 + 1], smoothed[i * 2 + 2], smoothed[i * 2 + 3])
    if (closed && pointCount > 2)
      out.push(
        smoothed[(pointCount - 1) * 2],
        smoothed[(pointCount - 1) * 2 + 1],
        smoothed[0],
        smoothed[1]
      )
  }

  return new Float32Array(out)
}

/** Line segments where `grid` (n×n heights, from x0/z0) crosses each level. */
const trace = (grid: Float32Array, size: number, x0: number, z0: number): ContourTile => {
  let low = Infinity
  let high = -Infinity
  for (const height of grid) {
    low = Math.min(low, height)
    high = Math.max(high, height)
  }
  const minor: number[] = []
  const major: number[] = []
  // Levels at half-steps, so the flat plateau top never sits exactly on one.
  for (let level = Math.floor(low - 0.5) + 0.5; level < high; level += 1) {
    const out = Math.round(level - 0.5) % 4 === 0 ? major : minor
    for (let j = 0; j < size - 1; j++)
      for (let i = 0; i < size - 1; i++) {
        const topLeft = grid[j * size + i] // top-left
        const topRight = grid[j * size + i + 1] // top-right
        const bottomRight = grid[(j + 1) * size + i + 1] // bottom-right
        const bottomLeft = grid[(j + 1) * size + i] // bottom-left
        const code =
          (topLeft > level ? 8 : 0) |
          (topRight > level ? 4 : 0) |
          (bottomRight > level ? 2 : 0) |
          (bottomLeft > level ? 1 : 0)
        if (code === 0 || code === 15) continue

        const x = x0 + i * CELL
        const z = z0 + j * CELL
        const at = (start: number, end: number) => (level - start) / (end - start)
        const top = [x + at(topLeft, topRight) * CELL, z]
        const right = [x + CELL, z + at(topRight, bottomRight) * CELL]
        const bottom = [x + at(bottomLeft, bottomRight) * CELL, z + CELL]
        const left = [x, z + at(topLeft, bottomLeft) * CELL]
        const segment = (from: number[], to: number[]) => out.push(from[0], from[1], to[0], to[1])
        switch (code) {
          case 1:
          case 14:
            segment(left, bottom)
            break
          case 2:
          case 13:
            segment(bottom, right)
            break
          case 3:
          case 12:
            segment(left, right)
            break
          case 4:
          case 11:
            segment(top, right)
            break
          case 6:
          case 9:
            segment(top, bottom)
            break
          case 7:
          case 8:
            segment(left, top)
            break
          case 5:
            segment(left, top)
            segment(bottom, right)
            break
          case 10:
            segment(top, right)
            segment(left, bottom)
            break
        }
      }
  }

  return { minor: smoothSegments(minor), major: smoothSegments(major), stars: new Float32Array() }
}

export const createLandscape = (objects: SceneObject[]): Landscape => {
  const field = getStructureField(objects)
  // Metres from the plateau's edge (0 on the plateau): the land falls away
  // from the building's own shape.
  const offPlateau = field
    ? (x: number, z: number) => Math.max(0, field.distanceAt(x, z) - PLATEAU_MARGIN)
    : (x: number, z: number) => Math.max(0, emptyDistance(x, z) - PLATEAU_MARGIN)
  const plateau = field?.plateau ?? emptyPlateau()
  // Each layout gets its own (but always the same) hills.
  const anchor = plateau[0]?.[0] ?? [0, 0]
  const seed = Math.round(anchor[0] * 7 + anchor[1] * 13 + objects.length * 31)

  const hillAt = (cellX: number, cellZ: number) => {
    if (hash(cellX, cellZ, seed) > 0.6) return null

    const x = (cellX + 0.15 + hash(cellX, cellZ, seed + 1) * 0.7) * HILL_CELL
    const z = (cellZ + 0.15 + hash(cellX, cellZ, seed + 2) * 0.7) * HILL_CELL
    if (offPlateau(x, z) < HILL_CLEARANCE) return null

    return {
      x,
      z,
      height: 3 + hash(cellX, cellZ, seed + 3) * 6,
      spread: 4 + hash(cellX, cellZ, seed + 4) * 4,
    }
  }

  const heightAt = (x: number, z: number) => {
    const distance = offPlateau(x, z)
    let height = DROP * Math.exp(-distance / FALLOFF)
    // Gentle undulation off the plateau, so the slopes aren't perfect rings.
    const away = Math.min(1, distance / 6)
    height += away * (1.4 * Math.sin(x * 0.13 + 0.7) * Math.cos(z * 0.11 - 0.3))
    height += away * (0.8 * Math.sin(x * 0.21 - z * 0.17 + 1.9))
    // Hills from this square and its neighbours (their reach is under a square).
    const squareX = Math.floor(x / HILL_CELL)
    const squareZ = Math.floor(z / HILL_CELL)
    for (let cellZ = squareZ - 1; cellZ <= squareZ + 1; cellZ++)
      for (let cellX = squareX - 1; cellX <= squareX + 1; cellX++) {
        const hill = hillAt(cellX, cellZ)
        if (!hill) continue

        const squaredDistance = (x - hill.x) ** 2 + (z - hill.z) ** 2
        height += hill.height * Math.exp(-squaredDistance / (2 * hill.spread ** 2))
      }

    return height
  }

  const size = Math.round(TILE / CELL) + 1
  const cache = new Map<string, ContourTile>()
  const tile = (tileX: number, tileZ: number) => {
    const key = `${tileX},${tileZ}`
    const cached = cache.get(key)
    if (cached) return cached

    const x0 = tileX * TILE
    const z0 = tileZ * TILE
    const grid = new Float32Array(size * size)
    for (let j = 0; j < size; j++)
      for (let i = 0; i < size; i++) grid[j * size + i] = heightAt(x0 + i * CELL, z0 + j * CELL)
    const stars: number[] = []
    for (let star = 0; star < STARS_PER_TILE; star++) {
      const x = x0 + hash(tileX * 97 + star, tileZ, seed + 5) * TILE
      const z = z0 + hash(tileX, tileZ * 89 + star, seed + 6) * TILE
      // Mostly faint, a few bright: brightness skewed low.
      if (offPlateau(x, z) >= STAR_CLEARANCE)
        stars.push(x, z, 0.25 + hash(tileX + star, tileZ - star, seed + 7) ** 3 * 0.75)
    }
    const traced = { ...trace(grid, size, x0, z0), stars: new Float32Array(stars) }
    // Keep memory bounded on long pans: forget the oldest tiles.
    if (cache.size > 400) cache.delete(cache.keys().next().value as string)

    cache.set(key, traced)

    return traced
  }

  return { plateau, tile }
}

/**
 * The landscape for the current layout. Rebuilt when the layout changes (the
 * plateau and slopes follow every wall and piece) — but not while a piece is
 * being carried: it would retrace the land at every snap. It settles on drop.
 */
export const useLandscape = (objects: SceneObject[]) => {
  const isCarrying = useEditorStore((state) => state.carryingId !== null)
  const settled = useRef(objects)
  if (!isCarrying) settled.current = objects

  const layout = settled.current

  return useMemo(() => createLandscape(layout), [layout])
}

/** The tiles (tx, tz) covering a world rectangle. */
export const tilesCovering = (x0: number, z0: number, x1: number, z1: number) => {
  const out: [number, number][] = []
  for (let tileZ = Math.floor(z0 / TILE); tileZ <= Math.floor(z1 / TILE); tileZ++)
    for (let tileX = Math.floor(x0 / TILE); tileX <= Math.floor(x1 / TILE); tileX++)
      out.push([tileX, tileZ])

  return out
}
