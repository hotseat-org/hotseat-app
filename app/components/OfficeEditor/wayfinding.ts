import {
  enclosedCells,
  footprintCells,
  footprintOverlapsSquare,
  isDiagonal,
  isDiagonalEdge,
  runsAlongX,
  unitEdges,
} from "./layout"
import { spotFor } from "./seatSpot"
import { useEditorStore } from "./store"
import { useDesksOnDay } from "./useBooking"
import {
  GRID,
  isEdgeType,
  isMarker,
  isOpening,
  isOverhead,
  isWallMounted,
  type SceneObject,
} from "./types"
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
const isObstacle = (o: SceneObject) =>
  !isEdgeType(o.type) &&
  !isMarker(o.type) &&
  !isOverhead(o.type) &&
  !isWallMounted(o.type) &&
  o.type !== "rug"

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
  for (const o of objects) {
    if (!isObstacle(o)) continue
    const [cx, cz] = footprintCells(o.type, o.rotation)
    const i0 = Math.round((o.x - (cx * GRID) / 2) / GRID)
    const j0 = Math.round((o.z - (cz * GRID) / 2) / GRID)
    // A piece on the diagonal blocks only the squares its turned shape covers,
    // not the whole square it fits in (aisles between angled desks stay open).
    const isTurned = isDiagonal(o.rotation)
    for (let i = i0; i < i0 + cx; i++)
      for (let j = j0; j < j0 + cz; j++)
        if (!isTurned || footprintOverlapsSquare(o, ...centre(i, j))) occupied.add(key(i, j))
  }

  const blocked = new Set<string>()
  const walled = new Set<string>()
  let bounds = { i0: Infinity, i1: -Infinity, j0: Infinity, j1: -Infinity }
  const doors: SceneObject[] = []
  for (const o of objects) {
    if (!isEdgeType(o.type)) continue
    if (o.type === "door" || o.type === "glassDoor") doors.push(o)
    for (const e of unitEdges(o)) {
      if (isDiagonalEdge(e.rotation)) {
        // A diagonal wall runs corner to corner through a square: the square
        // isn't walked through (a door in one is).
        const [i, j] = cellOf(e.x, e.z)
        bounds = {
          i0: Math.min(bounds.i0, i - 2),
          i1: Math.max(bounds.i1, i + 2),
          j0: Math.min(bounds.j0, j - 2),
          j1: Math.max(bounds.j1, j + 2),
        }
        if (!isOpening(o.type) || o.type === "window") walled.add(key(i, j))
        continue
      }
      const alongX = runsAlongX(e.rotation)
      const i = Math.round((alongX ? e.x - GRID / 2 : e.x) / GRID)
      const j = Math.round((alongX ? e.z : e.z - GRID / 2) / GRID)
      bounds = {
        i0: Math.min(bounds.i0, i - 2),
        i1: Math.max(bounds.i1, i + 2),
        j0: Math.min(bounds.j0, j - 2),
        j1: Math.max(bounds.j1, j + 2),
      }
      // Doors are walked through; walls and windows are not.
      if (!isOpening(o.type) || o.type === "window") blocked.add(`${alongX ? "h" : "v"}:${i},${j}`)
    }
  }
  if (!Number.isFinite(bounds.i0)) return null

  // An entrance: a door with the building on one side and the outdoors on the other.
  const inside = new Set(enclosedCells(objects).map((c) => key(...cellOf(c.x + 0.01, c.z + 0.01))))
  const entrances: Floor["entrances"] = []
  for (const d of doors) {
    if (isDiagonalEdge(d.rotation)) {
      // A door in a diagonal wall stands in the squares it crosses: the way in
      // is through them, to their inside neighbours; outdoors lies beyond.
      const cells: [number, number][] = []
      let outdoors = false
      for (const e of unitEdges(d)) {
        const [i, j] = cellOf(e.x, e.z)
        cells.push([i, j])
        for (const n of [
          [i + 1, j],
          [i - 1, j],
          [i, j + 1],
          [i, j - 1],
        ] as [number, number][]) {
          if (!inside.has(key(...n))) outdoors = true
          else if (!walled.has(key(...n))) cells.push(n)
        }
      }
      if (outdoors) entrances.push({ cells, door: [d.x, d.z] })
      continue
    }
    const cells: [number, number][] = []
    let outdoors = false
    for (const e of unitEdges(d)) {
      const alongX = runsAlongX(e.rotation)
      const i = Math.round((alongX ? e.x - GRID / 2 : e.x) / GRID)
      const j = Math.round((alongX ? e.z : e.z - GRID / 2) / GRID)
      const sides: [number, number][] = alongX
        ? [
            [i, j - 1],
            [i, j],
          ]
        : [
            [i - 1, j],
            [i, j],
          ]
      for (const s of sides) {
        if (inside.has(key(...s))) cells.push(s)
        else outdoors = true
      }
    }
    if (outdoors && cells.length) entrances.push({ cells, door: [d.x, d.z] })
  }
  for (const k of walled) occupied.add(k)
  return { occupied, blocked, walled, entrances, bounds }
}

/**
 * Can you step from square a to its neighbour b (one apart along one axis)?
 * `wallsOnly`: furniture doesn't count (only walls and windows stop you).
 */
const canStep = (
  floor: Floor,
  [ai, aj]: [number, number],
  [bi, bj]: [number, number],
  wallsOnly = false
) => {
  if (floor.walled.has(key(bi, bj))) return false
  if (!wallsOnly && floor.occupied.has(key(bi, bj))) return false
  if (bi !== ai) return !floor.blocked.has(`v:${Math.max(ai, bi)},${aj}`)
  return !floor.blocked.has(`h:${ai},${Math.max(aj, bj)}`)
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
  [ax, az]: [number, number],
  [bx, bz]: [number, number],
  wallsOnly = false
) => {
  const n = Math.ceil(Math.hypot(bx - ax, bz - az) / (GRID / 4))
  let prev = cellOf(ax, az) as [number, number]
  for (let s = 1; s <= n; s++) {
    const cell = cellOf(ax + ((bx - ax) * s) / n, az + ((bz - az) * s) / n) as [number, number]
    if (cell[0] === prev[0] && cell[1] === prev[1]) continue
    // Moving diagonally through a corner: both ways round must be open.
    if (cell[0] !== prev[0] && cell[1] !== prev[1]) {
      const viaX: [number, number] = [cell[0], prev[1]]
      const viaZ: [number, number] = [prev[0], cell[1]]
      const ok =
        (canStep(floor, prev, viaX, wallsOnly) && canStep(floor, viaX, cell, wallsOnly)) ||
        (canStep(floor, prev, viaZ, wallsOnly) && canStep(floor, viaZ, cell, wallsOnly))
      if (!ok) return false
    } else if (!canStep(floor, prev, cell, wallsOnly)) return false
    prev = cell
  }
  return true
}

/** A min-heap of squares by walking distance (for Dijkstra). */
class Queue {
  private items: { cell: [number, number]; d: number }[] = []
  get size() {
    return this.items.length
  }
  push(item: { cell: [number, number]; d: number }) {
    const a = this.items
    a.push(item)
    let i = a.length - 1
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (a[parent].d <= a[i].d) break
      ;[a[parent], a[i]] = [a[i], a[parent]]
      i = parent
    }
  }
  pop() {
    const a = this.items
    const top = a[0]
    const last = a.pop() as (typeof a)[number]
    if (a.length) {
      a[0] = last
      let i = 0
      while (true) {
        const l = i * 2 + 1
        const r = l + 1
        let min = i
        if (l < a.length && a[l].d < a[min].d) min = l
        if (r < a.length && a[r].d < a[min].d) min = r
        if (min === i) break
        ;[a[min], a[i]] = [a[i], a[min]]
        i = min
      }
    }
    return top
  }
}

/** Round a polyline's corners (Chaikin), keeping its two ends where they are. */
const round = (points: [number, number][], passes = 3) => {
  let p = points
  for (let n = 0; n < passes && p.length > 2; n++) {
    const q: [number, number][] = [p[0]]
    for (let i = 0; i < p.length - 1; i++) {
      const [ax, az] = p[i]
      const [bx, bz] = p[i + 1]
      if (i > 0) q.push([0.75 * ax + 0.25 * bx, 0.75 * az + 0.25 * bz])
      if (i < p.length - 2) q.push([0.25 * ax + 0.75 * bx, 0.25 * az + 0.75 * bz])
    }
    q.push(p[p.length - 1])
    p = q
  }
  return p
}

/** Starting squares: open ones round a chair (a desk's own squares are taken). */
const STAND_UP = 1

const findRoute = (objects: SceneObject[], deskId: string, fromDeskId?: string): Route | null => {
  const desk = objects.find((o) => o.id === deskId)
  if (!desk) return null
  const floor = readFloor(objects)
  if (!floor) return null
  const seats = objects.filter((o) => o.type === "seat")
  const spot = spotFor(desk, seats)

  // Where it starts: [square, its first point, the walk to it from there].
  const starts: { cell: [number, number]; point: [number, number]; d: number }[] = []
  const origin = fromDeskId ? objects.find((o) => o.id === fromDeskId) : undefined
  if (origin) {
    // Your chair: step out onto the open squares right round it.
    const chair = spotFor(origin, seats)
    const [ci, cj] = cellOf(chair.x, chair.z)
    const reach = Math.ceil(STAND_UP / GRID)
    for (let i = ci - reach; i <= ci + reach; i++)
      for (let j = cj - reach; j <= cj + reach; j++) {
        if (floor.occupied.has(key(i, j))) continue
        const [x, z] = centre(i, j)
        const d = Math.hypot(x - chair.x, z - chair.z)
        if (d <= STAND_UP && isClear(floor, [chair.x, chair.z], [x, z], true))
          starts.push({ cell: [i, j], point: [chair.x, chair.z], d })
      }
  } else
    for (const e of floor.entrances)
      for (const c of e.cells)
        if (!floor.occupied.has(key(...c))) starts.push({ cell: c, point: e.door, d: 0 })
  if (!starts.length) return null

  // Dijkstra from every start at once — the nearest entrance wins (the floor is
  // small: a few thousand squares).
  const dist = new Map<string, number>()
  const from = new Map<string, string | null>()
  const begin = new Map<string, [number, number]>() // where each square's walk started
  const queue = new Queue()
  for (const { cell, point, d } of starts) {
    const k = key(...cell)
    if (d >= (dist.get(k) ?? Infinity)) continue
    dist.set(k, d)
    from.set(k, null)
    begin.set(k, point)
    queue.push({ cell, d })
  }
  const { i0, i1, j0, j1 } = floor.bounds
  while (queue.size) {
    const { cell, d } = queue.pop()
    const k = key(...cell)
    if (d > (dist.get(k) ?? Infinity)) continue
    for (const [di, dj, cost] of STEPS) {
      const next: [number, number] = [cell[0] + di, cell[1] + dj]
      if (next[0] < i0 || next[0] > i1 || next[1] < j0 || next[1] > j1) continue
      const ok =
        di && dj
          ? canStep(floor, cell, [next[0], cell[1]]) &&
            canStep(floor, [next[0], cell[1]], next) &&
            canStep(floor, cell, [cell[0], next[1]]) &&
            canStep(floor, [cell[0], next[1]], next)
          : canStep(floor, cell, next)
      if (!ok) continue
      const nk = key(...next)
      const nd = d + cost
      if (nd >= (dist.get(nk) ?? Infinity)) continue
      dist.set(nk, nd)
      from.set(nk, k)
      begin.set(nk, begin.get(k) as [number, number])
      queue.push({ cell: next, d: nd })
    }
  }

  // Where we arrive: the reachable square nearest the chair (then the shorter
  // walk) — on the chair's side of any wall, so the last step never goes
  // through one (a desk backing onto a wall is nearest the other side).
  const goal = [...dist]
    .map(([k, d]) => {
      const [i, j] = k.split(",").map(Number)
      const [cx, cz] = centre(i, j)
      return {
        k,
        at: [cx, cz] as [number, number],
        score: Math.hypot(cx - spot.x, cz - spot.z) * 100 + d,
      }
    })
    .sort((a, b) => a.score - b.score)
    .find((c) => isClear(floor, c.at, [spot.x, spot.z], true))?.k
  if (!goal) return null

  // Squares back to the start, then the door (or your chair) and the chair at the ends.
  const cells: [number, number][] = []
  for (let k: string | null | undefined = goal; k; k = from.get(k)) {
    const [i, j] = k.split(",").map(Number)
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
    (p, i) => i === 0 || p[0] !== tight[i - 1][0] || p[1] !== tight[i - 1][1]
  )
  // As round as it can be without cutting a corner through a wall (by a door).
  const points =
    [3, 2, 1]
      .map((passes) => round(corners, passes))
      .find((p) => p.every((q, i) => i === 0 || isClear(floor, p[i - 1], q, true))) ?? corners
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
  const k = `${deskId}<${fromDeskId ?? ""}`
  if (!routes.has(k)) routes.set(k, findRoute(objects, deskId, fromDeskId))
  return routes.get(k) ?? null
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
  const route = useEditorStore((s) => s.route)
  const objects = useEditorStore((s) => s.objects)
  const me = useEditorStore((s) => s.booking.me)
  const { byPerson } = useDesksOnDay()
  if (!route) return null
  const desk = objects.find((o) => o.id === route.deskId)
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
export const routeBounds = (points: [number, number][], pad = 1.5) => {
  const xs = points.map((p) => p[0])
  const zs = points.map((p) => p[1])
  return {
    x0: Math.min(...xs) - pad,
    x1: Math.max(...xs) + pad,
    z0: Math.min(...zs) - pad,
    z1: Math.max(...zs) + pad,
  }
}
