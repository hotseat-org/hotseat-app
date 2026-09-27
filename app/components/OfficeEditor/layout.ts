import {
  BUILD_HALF,
  FOOTPRINT_CELLS,
  GRID,
  isEdgeType,
  isMarker,
  isOpening,
  isWall,
  GLASS_HOST,
  type OpeningType,
  isOverhead,
  isWallMounted,
  type Cell,
  type ObjectType,
  type SceneObject,
  type WallCell,
} from "./types"

const ALONG_Z = Math.PI / 2

/** Footprint size in grid squares, accounting for 90° rotation. */
export const footprintCells = (type: ObjectType, rotation: number): [number, number] => {
  const [wx, wz] = FOOTPRINT_CELLS[type]
  const turned = Math.abs(Math.round(rotation / ALONG_Z)) % 2 === 1
  return turned ? [wz, wx] : [wx, wz]
}

/** Snap one axis so a footprint of `cells` squares lands flush on grid lines. */
const snapAxis = (v: number, cells: number) =>
  cells % 2 === 0
    ? Math.round(v / GRID) * GRID // even: centre on a grid line
    : (Math.round(v / GRID - 0.5) + 0.5) * GRID // odd: centre in a square

/** Snap a position so the object's footprint occupies whole grid squares. */
export const snapToFootprint = (type: ObjectType, rotation: number, x: number, z: number): Cell => {
  const [cx, cz] = footprintCells(type, rotation)
  return { x: snapAxis(x, cx), z: snapAxis(z, cz) }
}

/** Keep a footprint centred at (x,z) fully on the buildable floor. */
export const clampToFloor = (type: ObjectType, rotation: number, p: Cell): Cell => {
  const [cx, cz] = footprintCells(type, rotation)
  const hx = BUILD_HALF - (cx * GRID) / 2
  const hz = BUILD_HALF - (cz * GRID) / 2
  return { x: Math.max(-hx, Math.min(hx, p.x)), z: Math.max(-hz, Math.min(hz, p.z)) }
}

/** True when a wall/door segment runs along X (rotation ~0) vs along Z (~90°). */
export const runsAlongX = (rotation: number) =>
  Math.abs(((rotation % Math.PI) + Math.PI) % Math.PI) < Math.PI / 4

/**
 * Wall segment length: walls live on the same 0.5 grid as furniture, so one
 * segment spans exactly one grid square. A door spans two segments (1 unit —
 * narrower would read as a slit).
 */
export const SEG = GRID
const DOOR_SEGS = 2

/** Length (world units) of a wall/door edge. */
export const edgeLength = (o: { type?: ObjectType }) => (isOpening(o.type) ? SEG * DOOR_SEGS : SEG)

/**
 * The unit (SEG-long) edges an edge object covers: a wall is one, a door two.
 * Everything that reasons about "which edges are taken/blocked" uses these.
 */
export const unitEdges = (o: SceneObject): WallCell[] => {
  if (!isOpening(o.type)) return [{ x: o.x, z: o.z, rotation: o.rotation }]
  const d = SEG / 2
  return runsAlongX(o.rotation)
    ? [
        { x: o.x - d, z: o.z, rotation: o.rotation },
        { x: o.x + d, z: o.z, rotation: o.rotation },
      ]
    : [
        { x: o.x, z: o.z - d, rotation: o.rotation },
        { x: o.x, z: o.z + d, rotation: o.rotation },
      ]
}

/** Stable key of a unit edge (position + orientation). */
export const edgeKey = (e: WallCell) => `${e.x},${e.z},${runsAlongX(e.rotation) ? "x" : "z"}`

/**
 * Upgrade layouts saved with the old 1-unit wall segments: each becomes two
 * half segments. Old wall centres sit on multiples of 0.5 along their run; new
 * ones on odd quarters (x.25 / x.75), so detection is exact and this is
 * idempotent. Doors kept their 1-unit size, so they need no change.
 */
export const normalizeEdges = (objects: SceneObject[]): SceneObject[] => {
  if (!objects.some((o) => o.type === "wall" && isLegacyWall(o))) return objects
  return objects.flatMap((o) => {
    if (o.type !== "wall" || !isLegacyWall(o)) return [o]
    const d = SEG / 2
    const alongX = runsAlongX(o.rotation)
    return [-d, d].map((off, i) => ({
      ...o,
      id: `${o.id}${i ? "b" : "a"}`,
      x: alongX ? o.x + off : o.x,
      z: alongX ? o.z : o.z + off,
    }))
  })
}
const isLegacyWall = (o: SceneObject) => {
  const along = runsAlongX(o.rotation) ? o.x : o.z
  return Math.round(along * 4) % 2 === 0
}

/**
 * What the Door / Glass door / Window tool (`kind`) does to segment `id`: a
 * wall half plus a neighbouring half of the same wall type on the same line
 * (the cursor's side preferred) become one opening; an opening of the same
 * kind turns back into its two wall halves (glass if it was cut into glass); an
 * opening of another kind is swapped in place (door ⇄ glass door ⇄ window).
 * Null when a wall has no neighbour to pair with, or for a window in glass.
 */
export const openingPlan = (
  objects: SceneObject[],
  id: string,
  kind: OpeningType,
  px?: number,
  pz?: number
): { remove: string[]; add: Omit<SceneObject, "id">[] } | null => {
  const o = objects.find((obj) => obj.id === id)
  if (!o || !isEdgeType(o.type)) return null
  if (isOpening(o.type)) {
    const glass = o.model === GLASS_HOST
    if (o.type === kind) {
      const host = glass ? "glassWall" : "wall"
      return { remove: [o.id], add: unitEdges(o).map((e) => ({ type: host, ...e })) }
    }
    // A window needs solid wall around it.
    if (kind === "window" && glass) return null
    return {
      remove: [o.id],
      add: [{ type: kind, x: o.x, z: o.z, rotation: o.rotation, model: o.model }],
    }
  }
  if (!isWall(o.type) || (kind === "window" && o.type === "glassWall")) return null
  const alongX = runsAlongX(o.rotation)
  const along = alongX ? o.x : o.z
  const cursor = alongX ? px : pz
  const first = cursor !== undefined && cursor < along ? -1 : 1
  for (const dir of [first, -first]) {
    const na = along + dir * SEG
    const partner = objects.find(
      (w) =>
        w.type === o.type &&
        runsAlongX(w.rotation) === alongX &&
        (alongX ? w.z === o.z && w.x === na : w.x === o.x && w.z === na)
    )
    if (!partner) continue
    const mid = (along + na) / 2
    return {
      remove: [o.id, partner.id],
      add: [
        {
          type: kind,
          x: alongX ? mid : o.x,
          z: alongX ? o.z : mid,
          rotation: o.rotation,
          ...(o.type === "glassWall" && { model: GLASS_HOST }),
        },
      ],
    }
  }
  return null
}

/** Wall edges along a single axis between two colinear nodes. */
const straightEdges = (a: Cell, b: Cell): WallCell[] => {
  const edges: WallCell[] = []
  if (a.z === b.z) {
    const n = Math.round(Math.abs(b.x - a.x) / SEG)
    const lo = Math.min(a.x, b.x)
    for (let i = 0; i < n; i++) edges.push({ x: lo + (i + 0.5) * SEG, z: a.z, rotation: 0 })
  } else if (a.x === b.x) {
    const n = Math.round(Math.abs(b.z - a.z) / SEG)
    const lo = Math.min(a.z, b.z)
    for (let i = 0; i < n; i++) edges.push({ x: a.x, z: lo + (i + 0.5) * SEG, rotation: ALONG_Z })
  }
  return edges
}

/**
 * L-shaped run of wall *edges* between two grid nodes (Sims-style drag-draw).
 * Runs along the dominant axis first, turns the corner, then finishes along the
 * other axis. Each edge sits at its midpoint so perpendicular segments meet
 * flush at shared nodes. A straight drag (one axis) yields a straight run.
 */
export const wallRun = (a: Cell, b: Cell): WallCell[] => {
  // A single click (no drag) drops one segment heading east, for feedback.
  if (a.x === b.x && a.z === b.z) return [{ x: a.x + SEG / 2, z: a.z, rotation: 0 }]

  const dx = b.x - a.x
  const dz = b.z - a.z
  const corner: Cell = Math.abs(dx) >= Math.abs(dz) ? { x: b.x, z: a.z } : { x: a.x, z: b.z }

  const seen = new Set<string>()
  return [...straightEdges(a, corner), ...straightEdges(corner, b)].filter((e) => {
    const k = `${e.x},${e.z},${Math.round(e.rotation * 100)}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

/** A footprint rectangle: centre ± half-extents (world units). */
interface Rect {
  x: number
  z: number
  hx: number
  hz: number
}

const footprintRect = (type: ObjectType, rotation: number, x: number, z: number): Rect => {
  const [cx, cz] = footprintCells(type, rotation)
  return { x, z, hx: (cx * GRID) / 2, hz: (cz * GRID) / 2 }
}

/**
 * Whether a wall/door edge cuts through a footprint's interior. The wall is
 * treated as its centre line, and comparisons are strict — so furniture may
 * stand flush against a wall (touching it), but never straddle one.
 */
const edgeCrossesRect = (
  e: { x: number; z: number; rotation: number; type?: ObjectType },
  r: Rect
) => {
  const h = edgeLength(e) / 2
  return runsAlongX(e.rotation)
    ? r.z - r.hz < e.z && e.z < r.z + r.hz && r.x - r.hx < e.x + h && e.x - h < r.x + r.hx
    : r.x - r.hx < e.x && e.x < r.x + r.hx && r.z - r.hz < e.z + h && e.z - h < r.z + r.hz
}

/**
 * The four walls of the rectangle between two grid nodes (Room tool). A drag
 * along one axis degenerates to a straight run, like the Wall tool.
 */
export const roomEdges = (a: Cell, b: Cell): WallCell[] => {
  if (a.x === b.x || a.z === b.z) return a.x === b.x && a.z === b.z ? [] : wallRun(a, b)
  const c1 = { x: b.x, z: a.z }
  const c2 = { x: a.x, z: b.z }
  return [
    ...straightEdges(a, c1),
    ...straightEdges(c1, b),
    ...straightEdges(c2, b),
    ...straightEdges(a, c2),
  ]
}

/** Which collision layer a piece lives in: the floor, the ceiling or a wall face. */
const layerOf = (type: ObjectType) =>
  isOverhead(type) ? "overhead" : isWallMounted(type) ? "wall" : "floor"

/** Unit vector a piece faces (its +Z) at a rotation. */
const facing = (rotation: number) => ({
  x: Math.round(Math.sin(rotation)),
  z: Math.round(Math.cos(rotation)),
})

/**
 * The solid wall segments behind a wall item's back edge (its −Z side), or
 * null unless EVERY segment along its width is a plain solid wall (not glass,
 * a door or a window). Also used to cut a wall item away with its wall.
 */
export const mountWalls = (
  objects: SceneObject[],
  type: ObjectType,
  x: number,
  z: number,
  rotation: number
): string[] | null => {
  const [w, d] = FOOTPRINT_CELLS[type]
  const f = facing(rotation)
  // Back-edge centre, and the direction along it.
  const bx = x - (f.x * d * GRID) / 2
  const bz = z - (f.z * d * GRID) / 2
  const along = { x: Math.abs(f.z), z: Math.abs(f.x) }
  const walls = new Map<string, string>()
  for (const o of objects) if (o.type === "wall") walls.set(edgeKey(o), o.id)
  const ids: string[] = []
  for (let i = 0; i < w; i++) {
    const off = (i - (w - 1) / 2) * SEG
    const key = edgeKey({
      x: bx + along.x * off,
      z: bz + along.z * off,
      rotation: along.x ? 0 : ALONG_Z,
    })
    const id = walls.get(key)
    if (!id) return null
    ids.push(id)
  }
  return ids
}

/**
 * Where a wall item goes for a cursor at (px, pz): against the face of the
 * nearest solid wall (within reach), facing the cursor's side, slid along the
 * wall to the cursor. Null when no wall is near.
 */
export const wallMount = (
  objects: SceneObject[],
  type: ObjectType,
  px: number,
  pz: number
): { x: number; z: number; rotation: number } | null => {
  const id = nearestEdgeId(objects, px, pz, 0.8, (o) => o.type === "wall")
  const wall = id && objects.find((o) => o.id === id)
  if (!wall) return null
  const [w, d] = FOOTPRINT_CELLS[type]
  const depth = (d * GRID) / 2
  if (runsAlongX(wall.rotation)) {
    const side = pz >= wall.z ? 1 : -1
    return { x: snapAxis(px, w), z: wall.z + side * depth, rotation: side > 0 ? 0 : Math.PI }
  }
  const side = px >= wall.x ? 1 : -1
  return {
    x: wall.x + side * depth,
    z: snapAxis(pz, w),
    rotation: side > 0 ? Math.PI / 2 : (Math.PI * 3) / 2,
  }
}

/**
 * Whether furniture of `type` at (x,z) would collide: overlapping other
 * furniture (grid-aligned footprints, so edge-to-edge is fine) or crossing a
 * wall/door. Rugs are floor décor — they may go under furniture, but not
 * through walls. Overhead items (ceiling lights) ignore everything on the
 * floor and walls, colliding only with each other. `ignoreId` skips the object being moved.
 */
export const furnitureCollides = (
  objects: SceneObject[],
  type: ObjectType,
  x: number,
  z: number,
  rotation: number,
  ignoreId?: string
): boolean => {
  if (isMarker(type)) return false
  // Wall items need solid wall behind their whole width.
  if (isWallMounted(type) && !mountWalls(objects, type, x, z, rotation)) return true
  const a = footprintRect(type, rotation, x, z)
  for (const o of objects) {
    if (o.id === ignoreId || isMarker(o.type)) continue
    if (isEdgeType(o.type)) {
      if (!isOverhead(type) && edgeCrossesRect(o, a)) return true
      continue
    }
    // Overhead items (ceiling lights) and wall items only bump into their own kind.
    if (layerOf(type) !== layerOf(o.type)) continue
    if (type === "rug" || o.type === "rug") continue
    const b = footprintRect(o.type, o.rotation, o.x, o.z)
    if (Math.abs(b.x - a.x) < a.hx + b.hx && Math.abs(b.z - a.z) < a.hz + b.hz) return true
  }
  return false
}

/**
 * Whether moving a GROUP of furniture to new positions would collide — with
 * anything not in the group, or with each other — or leave the floor.
 */
export const groupCollides = (objects: SceneObject[], moved: SceneObject[]): boolean => {
  const ids = new Set(moved.map((m) => m.id))
  const others = objects.filter((o) => !ids.has(o.id))
  return moved.some((m) => {
    const p = clampToFloor(m.type, m.rotation, { x: m.x, z: m.z })
    if (p.x !== m.x || p.z !== m.z) return true
    const rest = [...others, ...moved.filter((o) => o.id !== m.id)]
    return furnitureCollides(rest, m.type, m.x, m.z, m.rotation)
  })
}

/** Whether a wall/door edge would cut through any placed furniture (rugs included). */
export const edgeBlocked = (objects: SceneObject[], e: WallCell): boolean =>
  objects.some(
    (o) =>
      !isEdgeType(o.type) &&
      !isOverhead(o.type) &&
      !isMarker(o.type) &&
      edgeCrossesRect(e, footprintRect(o.type, o.rotation, o.x, o.z))
  )

/**
 * The SEG×SEG grid cells fully enclosed by walls/doors — i.e. the office interior,
 * for tinting the floor. Walls/doors sit on cell edges and block passage; a
 * flood-fill from the outside marks everything reachable, and whatever it can't
 * reach is "inside". Handles concave shapes and interior partitions; doors count
 * as barriers so a room stays enclosed. Each returned cell spans [x,x+SEG]×[z,z+SEG].
 */
export const enclosedCells = (objects: SceneObject[]): Cell[] => enclosedRegions(objects).flat()

/**
 * The enclosed cells grouped into ROOMS: connected components of the interior
 * (cells reachable from each other without crossing a wall/door/window). Used
 * to paint each room's floor separately.
 */
export const enclosedRegions = (objects: SceneObject[]): Cell[][] => {
  const blockedH = new Set<string>() // `i,j` blocks cells (i,j-1) ↔ (i,j)
  const blockedV = new Set<string>() // `i,j` blocks cells (i-1,j) ↔ (i,j)
  let minI = Infinity
  let maxI = -Infinity
  let minJ = Infinity
  let maxJ = -Infinity
  const touch = (i: number, j: number) => {
    if (i < minI) minI = i
    if (i > maxI) maxI = i
    if (j < minJ) minJ = j
    if (j > maxJ) maxJ = j
  }

  for (const o of objects) {
    if (!isEdgeType(o.type)) continue
    for (const e of unitEdges(o)) {
      if (runsAlongX(e.rotation)) {
        const i = Math.round((e.x - SEG / 2) / SEG)
        const j = Math.round(e.z / SEG)
        blockedH.add(`${i},${j}`)
        touch(i, j - 1)
        touch(i, j)
      } else {
        const i = Math.round(e.x / SEG)
        const j = Math.round((e.z - SEG / 2) / SEG)
        blockedV.add(`${i},${j}`)
        touch(i - 1, j)
        touch(i, j)
      }
    }
  }
  if (!Number.isFinite(minI)) return []

  // Expand by one so there's an outside ring to flood from.
  const loI = minI - 1
  const hiI = maxI + 1
  const loJ = minJ - 1
  const hiJ = maxJ + 1
  const key = (i: number, j: number) => `${i},${j}`
  const outside = new Set<string>()
  const stack: [number, number][] = []
  const visit = (i: number, j: number) => {
    if (i < loI || i > hiI || j < loJ || j > hiJ) return
    const k = key(i, j)
    if (outside.has(k)) return
    outside.add(k)
    stack.push([i, j])
  }
  for (let i = loI; i <= hiI; i++) {
    visit(i, loJ)
    visit(i, hiJ)
  }
  for (let j = loJ; j <= hiJ; j++) {
    visit(loI, j)
    visit(hiI, j)
  }
  while (stack.length) {
    const [i, j] = stack.pop() as [number, number]
    if (!blockedH.has(key(i, j + 1))) visit(i, j + 1) // north
    if (!blockedH.has(key(i, j))) visit(i, j - 1) // south
    if (!blockedV.has(key(i + 1, j))) visit(i + 1, j) // east
    if (!blockedV.has(key(i, j))) visit(i - 1, j) // west
  }

  // Split the interior into rooms: flood each unvisited inside cell's component
  // with the same wall-blocking rules.
  const seen = new Set<string>()
  const regions: Cell[][] = []
  for (let i = minI; i <= maxI; i++) {
    for (let j = minJ; j <= maxJ; j++) {
      const k0 = key(i, j)
      if (outside.has(k0) || seen.has(k0)) continue
      const region: Cell[] = []
      const queue: [number, number][] = [[i, j]]
      seen.add(k0)
      while (queue.length) {
        const [ci, cj] = queue.pop() as [number, number]
        region.push({ x: ci * SEG, z: cj * SEG })
        const step = (ni: number, nj: number, open: boolean) => {
          const k = key(ni, nj)
          if (!open || outside.has(k) || seen.has(k)) return
          if (ni < minI || ni > maxI || nj < minJ || nj > maxJ) return
          seen.add(k)
          queue.push([ni, nj])
        }
        step(ci, cj + 1, !blockedH.has(key(ci, cj + 1)))
        step(ci, cj - 1, !blockedH.has(key(ci, cj)))
        step(ci + 1, cj, !blockedV.has(key(ci + 1, cj)))
        step(ci - 1, cj, !blockedV.has(key(ci, cj)))
      }
      regions.push(region)
    }
  }
  return regions
}

/** The SEG cell (its min corner) containing a floor point. */
export const cellAt = (x: number, z: number): Cell => ({
  x: Math.floor(x / SEG) * SEG,
  z: Math.floor(z / SEG) * SEG,
})

/**
 * Paint tool, walls: the wall segments on the same straight line as `id` that
 * are contiguous with it — through any doors/windows in the line (they're part
 * of the wall, just not painted). Returns the wall ids to recolour.
 */
export const wallLine = (objects: SceneObject[], id: string): string[] => {
  const o = objects.find((obj) => obj.id === id)
  if (!o || !isEdgeType(o.type)) return []
  const alongX = runsAlongX(o.rotation)
  const fixed = alongX ? o.z : o.x
  // Unit edges on this line, keyed by position along it → owning object.
  const owner = new Map<number, SceneObject>()
  for (const w of objects) {
    if (!isEdgeType(w.type) || runsAlongX(w.rotation) !== alongX) continue
    if ((alongX ? w.z : w.x) !== fixed) continue
    for (const e of unitEdges(w)) owner.set(alongX ? e.x : e.z, w)
  }
  const ids = new Set<string>()
  const walk = (start: number, dir: number) => {
    for (let a = start; owner.has(a); a += dir * SEG) {
      const w = owner.get(a) as SceneObject
      if (w.type === "wall") ids.add(w.id)
    }
  }
  const origin = alongX ? o.x : o.z
  walk(origin, 1)
  walk(origin, -1)
  return [...ids]
}

/** The two grid nodes at the ends of a wall/door edge. */
export const edgeNodes = (o: SceneObject): [Cell, Cell] => {
  const h = edgeLength(o) / 2
  return runsAlongX(o.rotation)
    ? [
        { x: o.x - h, z: o.z },
        { x: o.x + h, z: o.z },
      ]
    : [
        { x: o.x, z: o.z - h },
        { x: o.x, z: o.z + h },
      ]
}

/** Shortest distance from a point to a line segment. */
const distToSegment = (px: number, pz: number, ax: number, az: number, bx: number, bz: number) => {
  const dx = bx - ax
  const dz = bz - az
  const lenSq = dx * dx + dz * dz || 1
  let t = ((px - ax) * dx + (pz - az) * dz) / lenSq
  t = Math.max(0, Math.min(1, t))
  const cx = ax + t * dx
  const cz = az + t * dz
  return Math.hypot(px - cx, pz - cz)
}

/** Id of the wall/door segment nearest a point, within `maxDist`, else null. */
export const nearestEdgeId = (
  objects: SceneObject[],
  px: number,
  pz: number,
  maxDist = 0.45,
  accept: (o: SceneObject) => boolean = (o) => isEdgeType(o.type)
): string | null => {
  let best: string | null = null
  let bestD = maxDist
  for (const o of objects) {
    if (!accept(o)) continue
    const [a, b] = edgeNodes(o)
    const d = distToSegment(px, pz, a.x, a.z, b.x, b.z)
    if (d < bestD) {
      bestD = d
      best = o.id
    }
  }
  return best
}

/**
 * Nodes where a corner post is needed — i.e. where wall/door edges of BOTH
 * orientations meet (corners, T- and X-junctions). Straight-through nodes and
 * free ends get no post, so a merged straight run stays perfectly seamless.
 */
export const wallJointNodes = (objects: SceneObject[]): Cell[] => {
  const map = new Map<string, { cell: Cell; horiz: number; vert: number }>()
  for (const o of objects) {
    if (!isEdgeType(o.type)) continue
    const horizontal = runsAlongX(o.rotation)
    for (const n of edgeNodes(o)) {
      const k = `${n.x},${n.z}`
      const e = map.get(k) ?? { cell: n, horiz: 0, vert: 0 }
      if (horizontal) e.horiz += 1
      else e.vert += 1
      map.set(k, e)
    }
  }
  return [...map.values()].filter((e) => e.horiz > 0 && e.vert > 0).map((e) => e.cell)
}
