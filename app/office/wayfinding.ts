import { useDesksOnDay } from "./useBooking"
import { spotFor } from "./seatSpot"
import {
  enclosedCells,
  footprintCells,
  footprintOverlapsSquare,
  isDiagonal,
  isDiagonalEdge,
  runsAlongX,
  unitEdges,
} from "~/editor/layout"
import { useEditorStore } from "~/editor/store"
import {
  GRID,
  isEdgeType,
  isMarker,
  isOverhead,
  isWallMounted,
  type SceneObject,
} from "~/editor/types"
import { getEdge, getItem } from "~/editor/catalog"
import type { Translator } from "~/i18n/translate"

/**
 * The way to a desk: from the nearest entrance (a door with the outdoors on one
 * side — whichever of several is closest) or from another desk's chair (your
 * own), to the desk's chair, walking round walls and furniture and through
 * doors. Found on the floor grid (GRID squares), then pulled tight and rounded,
 * so it reads as a path someone would walk. World metres.
 */
export interface Route {
  /** The path, entrance first: x, z pairs. */
  points: [number, number][]
  /** Walking distance (m). */
  length: number
}

/** A square of the floor grid, by index: it spans [i·GRID, (i+1)·GRID] in x, likewise j in z. */
const key = (i: number, j: number) => `${i},${j}`
const centre = (i: number, j: number): [number, number] => [(i + 0.5) * GRID, (j + 0.5) * GRID]
const cellOf = (x: number, z: number) => [Math.floor(x / GRID), Math.floor(z / GRID)] as const

/** Furniture you walk round (not rugs, nor what hangs on walls or ceilings). */
const isObstacle = (piece: SceneObject) =>
  !isEdgeType(piece.type) &&
  !isMarker(piece.type) &&
  !isOverhead(piece.type) &&
  !isWallMounted(piece.type) &&
  !getItem(piece.type).isUnderlay

interface Floor {
  /** Squares something stands on. */
  occupied: Set<string>
  /** Wall/window edges: `h:i,j` blocks (i,j−1)↔(i,j); `v:i,j` blocks (i−1,j)↔(i,j). */
  blocked: Set<string>
  /** Squares a diagonal wall runs through: walls, even for a walls-only check. */
  walled: Set<string>
  /** Inside squares next to each outside door, and the door's own centre. */
  entrances: { cells: [number, number][]; door: [number, number] }[]
  bounds: { i0: number; i1: number; j0: number; j1: number }
}

const readFloor = (objects: SceneObject[]): Floor | null => {
  const occupied = new Set<string>()
  for (const piece of objects) {
    if (!isObstacle(piece)) continue

    const [cellsX, cellsZ] = footprintCells(piece.type, piece.rotation)
    const i0 = Math.round((piece.x - (cellsX * GRID) / 2) / GRID)
    const j0 = Math.round((piece.z - (cellsZ * GRID) / 2) / GRID)
    // A piece on the diagonal blocks only the squares its turned shape covers,
    // not the whole square it fits in (aisles between angled desks stay open).
    const isTurned = isDiagonal(piece.rotation)
    for (let i = i0; i < i0 + cellsX; i++)
      for (let j = j0; j < j0 + cellsZ; j++)
        if (!isTurned || footprintOverlapsSquare(piece, ...centre(i, j))) occupied.add(key(i, j))
  }

  const blocked = new Set<string>()
  const walled = new Set<string>()
  let bounds = { i0: Infinity, i1: -Infinity, j0: Infinity, j1: -Infinity }
  const doors: SceneObject[] = []
  for (const piece of objects) {
    if (!isEdgeType(piece.type)) continue

    const isPassable = !!getEdge(piece.type)?.isPassable
    if (isPassable) doors.push(piece)

    for (const edge of unitEdges(piece)) {
      if (isDiagonalEdge(edge.rotation)) {
        // A diagonal wall runs corner to corner through a square: the square
        // isn't walked through (a door in one is).
        const [i, j] = cellOf(edge.x, edge.z)
        bounds = {
          i0: Math.min(bounds.i0, i - 2),
          i1: Math.max(bounds.i1, i + 2),
          j0: Math.min(bounds.j0, j - 2),
          j1: Math.max(bounds.j1, j + 2),
        }
        if (!isPassable) walled.add(key(i, j))

        continue
      }

      const alongX = runsAlongX(edge.rotation)
      const i = Math.round((alongX ? edge.x - GRID / 2 : edge.x) / GRID)
      const j = Math.round((alongX ? edge.z : edge.z - GRID / 2) / GRID)
      bounds = {
        i0: Math.min(bounds.i0, i - 2),
        i1: Math.max(bounds.i1, i + 2),
        j0: Math.min(bounds.j0, j - 2),
        j1: Math.max(bounds.j1, j + 2),
      }
      // Doors are walked through; walls and windows are not.
      if (!isPassable) blocked.add(`${alongX ? "h" : "v"}:${i},${j}`)
    }
  }
  if (!Number.isFinite(bounds.i0)) return null

  // An entrance: a door with the building on one side and the outdoors on the other.
  const inside = new Set(
    enclosedCells(objects).map((cell) => key(...cellOf(cell.x + 0.01, cell.z + 0.01)))
  )
  const entrances: Floor["entrances"] = []
  for (const door of doors) {
    if (isDiagonalEdge(door.rotation)) {
      // A door in a diagonal wall stands in the squares it crosses: the way in
      // is through them, to their inside neighbours; outdoors lies beyond.
      const cells: [number, number][] = []
      let outdoors = false
      for (const edge of unitEdges(door)) {
        const [i, j] = cellOf(edge.x, edge.z)
        cells.push([i, j])
        for (const neighbour of [
          [i + 1, j],
          [i - 1, j],
          [i, j + 1],
          [i, j - 1],
        ] as [number, number][]) {
          if (!inside.has(key(...neighbour))) outdoors = true
          else if (!walled.has(key(...neighbour))) cells.push(neighbour)
        }
      }
      if (outdoors) entrances.push({ cells, door: [door.x, door.z] })

      continue
    }

    const cells: [number, number][] = []
    let outdoors = false
    for (const edge of unitEdges(door)) {
      const alongX = runsAlongX(edge.rotation)
      const i = Math.round((alongX ? edge.x - GRID / 2 : edge.x) / GRID)
      const j = Math.round((alongX ? edge.z : edge.z - GRID / 2) / GRID)
      const sides: [number, number][] = alongX
        ? [
            [i, j - 1],
            [i, j],
          ]
        : [
            [i - 1, j],
            [i, j],
          ]
      for (const side of sides) {
        if (inside.has(key(...side))) cells.push(side)
        else outdoors = true
      }
    }
    if (outdoors && cells.length) entrances.push({ cells, door: [door.x, door.z] })
  }
  for (const cellKey of walled) occupied.add(cellKey)

  return { occupied, blocked, walled, entrances, bounds }
}

/**
 * Can you step from a square to its neighbour (one apart along one axis)?
 * `wallsOnly`: furniture doesn't count (only walls and windows stop you).
 */
const canStep = (
  floor: Floor,
  [fromI, fromJ]: [number, number],
  [toI, toJ]: [number, number],
  wallsOnly = false
) => {
  if (floor.walled.has(key(toI, toJ))) return false
  if (!wallsOnly && floor.occupied.has(key(toI, toJ))) return false
  if (toI !== fromI) return !floor.blocked.has(`v:${Math.max(fromI, toI)},${fromJ}`)

  return !floor.blocked.has(`h:${fromI},${Math.max(fromJ, toJ)}`)
}

const STEPS: [number, number, number][] = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [-1, -1, Math.SQRT2],
]

/**
 * Can you walk straight from one point to another (no wall, no furniture)?
 * `wallsOnly`: just no wall in between (a chair's last step, a rounded corner).
 */
const isClear = (
  floor: Floor,
  [fromX, fromZ]: [number, number],
  [toX, toZ]: [number, number],
  wallsOnly = false
) => {
  const steps = Math.ceil(Math.hypot(toX - fromX, toZ - fromZ) / (GRID / 4))
  let prev = cellOf(fromX, fromZ) as [number, number]
  for (let step = 1; step <= steps; step++) {
    const cell = cellOf(
      fromX + ((toX - fromX) * step) / steps,
      fromZ + ((toZ - fromZ) * step) / steps
    ) as [number, number]
    if (cell[0] === prev[0] && cell[1] === prev[1]) continue
    // Moving diagonally through a corner: both ways round must be open.
    if (cell[0] !== prev[0] && cell[1] !== prev[1]) {
      const viaX: [number, number] = [cell[0], prev[1]]
      const viaZ: [number, number] = [prev[0], cell[1]]
      const isOpen =
        (canStep(floor, prev, viaX, wallsOnly) && canStep(floor, viaX, cell, wallsOnly)) ||
        (canStep(floor, prev, viaZ, wallsOnly) && canStep(floor, viaZ, cell, wallsOnly))
      if (!isOpen) return false
    } else if (!canStep(floor, prev, cell, wallsOnly)) return false

    prev = cell
  }

  return true
}

/** Trades two entries of a list in place. */
const swap = <Item>(items: Item[], first: number, second: number) => {
  ;[items[first], items[second]] = [items[second], items[first]]
}

/** A min-heap of squares by walking distance (for Dijkstra). */
class Queue {
  private items: { cell: [number, number]; distance: number }[] = []
  get size() {
    return this.items.length
  }
  push(item: { cell: [number, number]; distance: number }) {
    const heap = this.items
    heap.push(item)
    let i = heap.length - 1
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (heap[parent].distance <= heap[i].distance) break

      swap(heap, parent, i)
      i = parent
    }
  }
  pop() {
    const heap = this.items
    const top = heap[0]
    const last = heap.pop() as (typeof heap)[number]
    if (heap.length) {
      heap[0] = last
      let i = 0
      while (true) {
        const left = i * 2 + 1
        const right = left + 1
        let min = i
        if (left < heap.length && heap[left].distance < heap[min].distance) min = left
        if (right < heap.length && heap[right].distance < heap[min].distance) min = right
        if (min === i) break

        swap(heap, min, i)
        i = min
      }
    }

    return top
  }
}

/** Round a polyline's corners (Chaikin), keeping its two ends where they are. */
const round = (points: [number, number][], passes = 3) => {
  let current = points
  for (let pass = 0; pass < passes && current.length > 2; pass++) {
    const refined: [number, number][] = [current[0]]
    for (let i = 0; i < current.length - 1; i++) {
      const [fromX, fromZ] = current[i]
      const [toX, toZ] = current[i + 1]
      if (i > 0) refined.push([0.75 * fromX + 0.25 * toX, 0.75 * fromZ + 0.25 * toZ])
      if (i < current.length - 2)
        refined.push([0.25 * fromX + 0.75 * toX, 0.25 * fromZ + 0.75 * toZ])
    }
    refined.push(current[current.length - 1])
    current = refined
  }

  return current
}

/** Starting squares: open ones round a chair (a desk's own squares are taken). */
const STAND_UP = 1

const findRoute = (objects: SceneObject[], deskId: string, fromDeskId?: string): Route | null => {
  const desk = objects.find((piece) => piece.id === deskId)
  if (!desk) return null

  const floor = readFloor(objects)
  if (!floor) return null

  const seats = objects.filter((piece) => piece.type === "seat")
  const spot = spotFor(desk, seats)

  // Where it starts: [square, its first point, the walk to it from there].
  const starts: { cell: [number, number]; point: [number, number]; distance: number }[] = []
  const origin = fromDeskId ? objects.find((piece) => piece.id === fromDeskId) : undefined
  if (origin) {
    // Your chair: step out onto the open squares right round it.
    const chair = spotFor(origin, seats)
    const [cellI, cellJ] = cellOf(chair.x, chair.z)
    const reach = Math.ceil(STAND_UP / GRID)
    for (let i = cellI - reach; i <= cellI + reach; i++)
      for (let j = cellJ - reach; j <= cellJ + reach; j++) {
        if (floor.occupied.has(key(i, j))) continue

        const [x, z] = centre(i, j)
        const distance = Math.hypot(x - chair.x, z - chair.z)
        if (distance <= STAND_UP && isClear(floor, [chair.x, chair.z], [x, z], true))
          starts.push({ cell: [i, j], point: [chair.x, chair.z], distance })
      }
  } else
    for (const entrance of floor.entrances)
      for (const cell of entrance.cells)
        if (!floor.occupied.has(key(...cell)))
          starts.push({ cell, point: entrance.door, distance: 0 })
  if (!starts.length) return null

  // Dijkstra from every start at once — the nearest entrance wins (the floor is
  // small: a few thousand squares).
  const distances = new Map<string, number>()
  const from = new Map<string, string | null>()
  const begin = new Map<string, [number, number]>() // where each square's walk started
  const queue = new Queue()
  for (const { cell, point, distance: distance } of starts) {
    const cellKey = key(...cell)
    if (distance >= (distances.get(cellKey) ?? Infinity)) continue

    distances.set(cellKey, distance)
    from.set(cellKey, null)
    begin.set(cellKey, point)
    queue.push({ cell, distance })
  }
  const { i0, i1, j0, j1 } = floor.bounds
  while (queue.size) {
    const { cell, distance: distance } = queue.pop()
    const cellKey = key(...cell)
    if (distance > (distances.get(cellKey) ?? Infinity)) continue

    for (const [deltaI, deltaJ, cost] of STEPS) {
      const next: [number, number] = [cell[0] + deltaI, cell[1] + deltaJ]
      if (next[0] < i0 || next[0] > i1 || next[1] < j0 || next[1] > j1) continue

      const isOpen =
        deltaI && deltaJ
          ? canStep(floor, cell, [next[0], cell[1]]) &&
            canStep(floor, [next[0], cell[1]], next) &&
            canStep(floor, cell, [cell[0], next[1]]) &&
            canStep(floor, [cell[0], next[1]], next)
          : canStep(floor, cell, next)
      if (!isOpen) continue

      const nextKey = key(...next)
      const nextDistance = distance + cost
      if (nextDistance >= (distances.get(nextKey) ?? Infinity)) continue

      distances.set(nextKey, nextDistance)
      from.set(nextKey, cellKey)
      begin.set(nextKey, begin.get(cellKey) as [number, number])
      queue.push({ cell: next, distance: nextDistance })
    }
  }

  // Where we arrive: the reachable square nearest the chair (then the shorter
  // walk) — on the chair's side of any wall, so the last step never goes
  // through one (a desk backing onto a wall is nearest the other side).
  const goal = [...distances]
    .map(([cellKey, distance]) => {
      const [i, j] = cellKey.split(",").map(Number)
      const [centreX, centreZ] = centre(i, j)

      return {
        k: cellKey,
        at: [centreX, centreZ] as [number, number],
        score: Math.hypot(centreX - spot.x, centreZ - spot.z) * 100 + distance,
      }
    })
    .sort((first, second) => first.score - second.score)
    .find((candidate) => isClear(floor, candidate.at, [spot.x, spot.z], true))?.k
  if (!goal) return null

  // Squares back to the start, then the door (or your chair) and the chair at the ends.
  const cells: [number, number][] = []
  for (let cellKey: string | null | undefined = goal; cellKey; cellKey = from.get(cellKey)) {
    const [i, j] = cellKey.split(",").map(Number)
    cells.unshift(centre(i, j))
  }
  const path: [number, number][] = [begin.get(goal) as [number, number], ...cells, [spot.x, spot.z]]

  // Pull it tight: from each point, straight on to the furthest one in clear view.
  const tight: [number, number][] = [path[0]]
  let at = 1
  while (at < path.length - 1) {
    let next = at
    while (next + 1 < path.length - 1 && isClear(floor, path[at], path[next + 1])) next++
    tight.push(path[at])
    at = next === at ? at + 1 : next
  }
  tight.push(path[path.length - 2], path[path.length - 1])
  const corners = tight.filter(
    (point, i) => i === 0 || point[0] !== tight[i - 1][0] || point[1] !== tight[i - 1][1]
  )
  // As round as it can be without cutting a corner through a wall (by a door).
  const points =
    [3, 2, 1]
      .map((passes) => round(corners, passes))
      .find((candidate) =>
        candidate.every((point, i) => i === 0 || isClear(floor, candidate[i - 1], point, true))
      ) ?? corners
  let length = 0
  for (let i = 1; i < points.length; i++)
    length += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1])

  return { points, length }
}

/**
 * One route per layout, desk and start (the objects array is replaced on every
 * change). From the nearest entrance, or from `fromDeskId`'s chair.
 */
const cache = new WeakMap<SceneObject[], Map<string, Route | null>>()
export const getRoute = (
  objects: SceneObject[],
  deskId: string,
  fromDeskId?: string
): Route | null => {
  let routes = cache.get(objects)
  if (!routes) cache.set(objects, (routes = new Map()))

  const cacheKey = `${deskId}<${fromDeskId ?? ""}`
  if (!routes.has(cacheKey)) routes.set(cacheKey, findRoute(objects, deskId, fromDeskId))

  return routes.get(cacheKey) ?? null
}

/** "1 min walk", "2 min walk" — at an easy indoor pace. */
export const walkTime = ({ t }: Translator, metres: number) =>
  t("{n} min walk", { n: Math.max(1, Math.round(metres / 1.1 / 60)) })

/**
 * The route being shown (store `route`), worked out for the current layout:
 * which desk, its path — from your desk on the shown day (when you have one
 * and asked for another), else the nearest entrance; null when there's no way
 * (no outside door) — and `nonce`, which changes each time it's asked for or
 * its start is switched (to re-frame the view).
 */
export const useRoute = () => {
  const route = useEditorStore((state) => state.route)
  const objects = useEditorStore((state) => state.objects)
  const me = useEditorStore((state) => state.booking.me)
  const { byPerson } = useDesksOnDay()
  if (!route) return null

  const desk = objects.find((piece) => piece.id === route.deskId)
  if (!desk) return null

  // Your desk on the shown day — the way starts there, unless it's where you're going.
  const myDesk = me ? byPerson.get(me)?.desk : undefined
  const canStartAtMyDesk = !!myDesk && myDesk.id !== desk.id
  const fromMyDesk = canStartAtMyDesk && route.from === "desk"

  return {
    ...route,
    desk,
    myDesk: canStartAtMyDesk ? myDesk : undefined,
    fromMyDesk,
    path: getRoute(objects, route.deskId, fromMyDesk ? myDesk?.id : undefined),
  }
}

/** The box round a route's points, with `pad` metres to spare on every side. */
export const routeBounds = (points: [number, number][], padding = 1.5) => {
  const xs = points.map((point) => point[0])
  const zs = points.map((point) => point[1])

  return {
    x0: Math.min(...xs) - padding,
    x1: Math.max(...xs) + padding,
    z0: Math.min(...zs) - padding,
    z1: Math.max(...zs) + padding,
  }
}
