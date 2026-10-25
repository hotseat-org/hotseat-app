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

/** Furniture turns in eighths: 45° steps. */
export const ROTATION_STEP = Math.PI / 4

/** A rotation to its nearest 45° step, as an exact value in [0, 2π). */
export const toRotationStep = (rotation: number) => {
  const steps = ((Math.round(rotation / ROTATION_STEP) % 8) + 8) % 8
  return steps * ROTATION_STEP
}

/** Turned off the grid's axes (45°, 135°…), not a whole quarter turn. */
export const isDiagonal = (rotation: number) => {
  const quarters = rotation / ALONG_Z
  return Math.abs(quarters - Math.round(quarters)) > 0.01
}

/**
 * Footprint size in grid squares, accounting for rotation. A diagonal piece
 * gets the square its turned shape fits in — what anything working in whole
 * squares (snapping, the floor's edge, routes, framing) goes by; collisions use
 * the turned shape itself (see footprintRect).
 */
export const footprintCells = (type: ObjectType, rotation: number): [number, number] => {
  const [wx, wz] = FOOTPRINT_CELLS[type]
  if (isDiagonal(rotation)) {
    const side = Math.ceil((wx + wz) * Math.SQRT1_2 - 1e-6)
    return [side, side]
  }
  const turned = Math.abs(Math.round(rotation / ALONG_Z)) % 2 === 1
  return turned ? [wz, wx] : [wx, wz]
}

/**
 * Snap one axis so a footprint of `cells` squares lands flush on grid lines.
 * A turn can leave the centre exactly between two places (when the count of
 * squares changes between odd and even): such ties always go up into an odd
 * count and down into an even one, so a piece turned full circle ends up
 * exactly where it started instead of creeping a quarter square per turn.
 */
const snapAxis = (v: number, cells: number) =>
  cells % 2 === 0
    ? Math.ceil(v / GRID - 0.5) * GRID // even: centre on a grid line (ties down)
    : (Math.round(v / GRID - 0.5) + 0.5) * GRID // odd: centre in a square (ties up)

/** Snap a position so the object's footprint occupies whole grid squares. */
export const snapToFootprint = (type: ObjectType, rotation: number, x: number, z: number): Cell => {
  const [cx, cz] = footprintCells(type, rotation)
  return { x: snapAxis(x, cx), z: snapAxis(z, cz) }
}

/** How a furniture tool places: one piece, a row of copies, or a back-to-back pod of two rows. */
export type PlacementPattern = "single" | "row" | "pod"

/** Most copies one drag lays (a row across a big floor, not a runaway). */
const MAX_REPEAT = 40

/**
 * The copies a Row/Pod drag lays from `start` to `end`: side by side, flush,
 * along whichever of the piece's own directions (its width or its depth) the
 * drag follows more — a turned piece's too. A pod adds a second row back to
 * back with the first, turned to face the other way (desks facing across).
 */
export const composeRepeat = (
  type: ObjectType,
  rotation: number,
  start: Cell,
  end: Cell,
  pattern: Exclude<PlacementPattern, "single">
): { x: number; z: number; rotation: number }[] => {
  const [w, d] = FOOTPRINT_CELLS[type]
  // The piece's own axes in the world: X (its width) and Z (its depth, front +Z).
  const ax = { x: Math.cos(rotation), z: -Math.sin(rotation) }
  const az = { x: Math.sin(rotation), z: Math.cos(rotation) }
  const dx = end.x - start.x
  const dz = end.z - start.z
  const alongWidth = (dx * ax.x + dz * ax.z) / (w * GRID)
  const alongDepth = (dx * az.x + dz * az.z) / (d * GRID)
  // Rows run along the width unless the drag goes clearly more along the depth.
  const isAlongWidth = Math.abs(alongWidth) >= Math.abs(alongDepth) || pattern === "pod"
  const steps = isAlongWidth ? alongWidth : alongDepth
  const count = Math.min(MAX_REPEAT, Math.floor(Math.abs(steps) + 0.5) + 1)
  const axis = isAlongWidth ? ax : az
  const stride = (isAlongWidth ? w : d) * GRID * Math.sign(steps || 1)
  const row = Array.from({ length: count }, (_, i) => ({
    x: start.x + axis.x * stride * i,
    z: start.z + axis.z * stride * i,
    rotation,
  }))
  if (pattern === "row") return row
  // Back to back: the second row behind the first (its −Z side), facing away.
  const behind = d * GRID
  return [
    ...row,
    ...row.map((p) => ({
      x: p.x - az.x * behind,
      z: p.z - az.z * behind,
      rotation: toRotationStep(rotation + Math.PI),
    })),
  ]
}

/** How far (m) beyond touching a diagonal wall a turned piece is pulled flush against it. */
const FLUSH_REACH = 0.6

/**
 * Where a piece goes for a cursor at (x, z): on the grid, kept on the floor —
 * or, turned to 45° beside a diagonal wall running the same way, flush against
 * that wall's face (back or side to it), slid along it in half-segment steps.
 * Grid points never put a turned piece flush with a diagonal: its centre must
 * sit half its depth from the wall's line, a distance with √2 in it.
 */
export const snapPlacement = (
  objects: SceneObject[],
  type: ObjectType,
  rotation: number,
  x: number,
  z: number
): Cell => {
  const onGrid = clampToFloor(type, rotation, snapToFootprint(type, rotation, x, z))
  if (!isDiagonal(rotation) || isWallMounted(type) || isOverhead(type)) return onGrid
  const [wx, wz] = FOOTPRINT_CELLS[type]
  // The piece's own axes in the world: X (its width) and Z (its depth).
  const ax = { x: Math.cos(rotation), z: -Math.sin(rotation) }
  let best: { d: number; p: Cell } | null = null
  for (const o of objects) {
    if (!isEdgeType(o.type) || !isDiagonalEdge(o.rotation)) continue
    const [sx, sz] = edgeStep(o.rotation)
    const length = Math.hypot(sx, sz)
    const u = { x: sx / length, z: sz / length }
    const n = { x: -u.z, z: u.x }
    // Width along the wall (back to it) or across it (side to it).
    const isBackToWall = Math.abs(ax.x * u.x + ax.z * u.z) > 0.99
    const flush = ((isBackToWall ? wz : wx) * GRID) / 2
    const across = (x - o.x) * n.x + (z - o.z) * n.z
    const along = (x - o.x) * u.x + (z - o.z) * u.z
    // Near this segment's face, beside it along the wall (with some slack).
    if (Math.abs(across) > flush + FLUSH_REACH) continue
    if (Math.abs(along) > length / 2 + flush + FLUSH_REACH) continue
    const gap = Math.abs(Math.abs(across) - flush)
    if (best && gap >= best.d) continue
    const step = length / 2
    const t = Math.round(along / step) * step
    const side = across >= 0 ? 1 : -1
    best = {
      d: gap,
      p: { x: o.x + u.x * t + n.x * side * flush, z: o.z + u.z * t + n.z * side * flush },
    }
  }
  return best ? best.p : onGrid
}

/** Keep a footprint centred at (x,z) fully on the buildable floor. */
export const clampToFloor = (type: ObjectType, rotation: number, p: Cell): Cell => {
  const [cx, cz] = footprintCells(type, rotation)
  const hx = BUILD_HALF - (cx * GRID) / 2
  const hz = BUILD_HALF - (cz * GRID) / 2
  return { x: Math.max(-hx, Math.min(hx, p.x)), z: Math.max(-hz, Math.min(hz, p.z)) }
}

/**
 * Which way a wall/door edge runs: along X, along Z, or across a grid square
 * corner to corner — "rising" (x and z grow together) or "falling" (z drops as
 * x grows). A piece runs along its local X, turned by its rotation.
 */
export type EdgeDirection = "x" | "z" | "rising" | "falling"

export const edgeDirection = (rotation: number): EdgeDirection => {
  const eighths = Math.round((((rotation % Math.PI) + Math.PI) % Math.PI) / (Math.PI / 4)) % 4
  return eighths === 0 ? "x" : eighths === 1 ? "falling" : eighths === 2 ? "z" : "rising"
}

/** The rotation a wall/door is built with to run each way. */
export const EDGE_ROTATION: Record<EdgeDirection, number> = {
  x: 0,
  falling: Math.PI / 4,
  z: Math.PI / 2,
  rising: (3 * Math.PI) / 4,
}

/** True when a wall/door segment runs along X (not along Z, nor diagonally). */
export const runsAlongX = (rotation: number) => edgeDirection(rotation) === "x"

/** Runs corner to corner across grid squares. */
export const isDiagonalEdge = (rotation: number) => {
  const direction = edgeDirection(rotation)
  return direction === "rising" || direction === "falling"
}

/** From one grid node to the next along an edge's direction (x grows; for Z, z grows). */
export const edgeStep = (rotation: number): [number, number] => {
  switch (edgeDirection(rotation)) {
    case "x":
      return [SEG, 0]
    case "z":
      return [0, SEG]
    case "rising":
      return [SEG, SEG]
    case "falling":
      return [SEG, -SEG]
  }
}

/**
 * Wall segment length: walls live on the same 0.5 grid as furniture, so one
 * segment spans exactly one grid square. A door spans two segments (1 unit —
 * narrower would read as a slit).
 */
export const SEG = GRID
const DOOR_SEGS = 2

/**
 * How much a single wall/door/window model is stretched along its run: the
 * models are made for a straight edge; a diagonal one is √2 longer.
 */
export const edgeStretch = (type: ObjectType, rotation: number): [number, number, number] =>
  isEdgeType(type) && isDiagonalEdge(rotation) ? [Math.SQRT2, 1, 1] : [1, 1, 1]

/** Length (world units) of a wall/door edge: a unit edge is SEG, or SEG·√2 diagonally. */
export const edgeLength = (o: { type?: ObjectType; rotation?: number }) =>
  (isOpening(o.type) ? DOOR_SEGS : 1) *
  (o.rotation !== undefined && isDiagonalEdge(o.rotation) ? SEG * Math.SQRT2 : SEG)

/**
 * The unit (SEG-long) edges an edge object covers: a wall is one, a door two.
 * Everything that reasons about "which edges are taken/blocked" uses these.
 */
export const unitEdges = (o: SceneObject): WallCell[] => {
  if (!isOpening(o.type)) return [{ x: o.x, z: o.z, rotation: o.rotation }]
  const [sx, sz] = edgeStep(o.rotation)
  return [-0.5, 0.5].map((k) => ({ x: o.x + k * sx, z: o.z + k * sz, rotation: o.rotation }))
}

/** Stable key of a unit edge (position + direction). */
export const edgeKey = (e: WallCell) => `${e.x},${e.z},${edgeDirection(e.rotation)}`

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
  if (isDiagonalEdge(o.rotation)) return false // diagonals came later
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
  const direction = edgeDirection(o.rotation)
  const [sx, sz] = edgeStep(o.rotation)
  // The cursor's side of the segment, along the line, is tried first.
  const cursorAlong = px !== undefined && pz !== undefined ? (px - o.x) * sx + (pz - o.z) * sz : 0
  const first = cursorAlong < 0 ? -1 : 1
  for (const dir of [first, -first]) {
    const nx = o.x + dir * sx
    const nz = o.z + dir * sz
    const partner = objects.find(
      (w) =>
        w.type === o.type && edgeDirection(w.rotation) === direction && w.x === nx && w.z === nz
    )
    if (!partner) continue
    return {
      remove: [o.id, partner.id],
      add: [
        {
          type: kind,
          x: (o.x + nx) / 2,
          z: (o.z + nz) / 2,
          rotation: o.rotation,
          ...(o.type === "glassWall" && { model: GLASS_HOST }),
        },
      ],
    }
  }
  return null
}

/** Wall edges between two nodes on one line: along an axis, or exactly diagonal. */
const straightEdges = (a: Cell, b: Cell): WallCell[] => {
  const edges: WallCell[] = []
  const dx = b.x - a.x
  const dz = b.z - a.z
  if (dx !== 0 && Math.abs(Math.abs(dx) - Math.abs(dz)) < 1e-9) {
    // Corner to corner across squares: from the node with the smaller x.
    const [from, to] = dx > 0 ? [a, b] : [b, a]
    const isRising = to.z > from.z
    const n = Math.round(Math.abs(dx) / SEG)
    for (let i = 0; i < n; i++)
      edges.push({
        x: from.x + (i + 0.5) * SEG,
        z: from.z + (isRising ? 1 : -1) * (i + 0.5) * SEG,
        rotation: EDGE_ROTATION[isRising ? "rising" : "falling"],
      })
    return edges
  }
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
  // Dragged nearer 45° than either axis: a diagonal run, as long as the drag.
  const ratio = Math.min(Math.abs(dx), Math.abs(dz)) / Math.max(Math.abs(dx), Math.abs(dz))
  if (ratio > Math.tan(Math.PI / 8)) {
    const n = Math.max(1, Math.round((Math.abs(dx) + Math.abs(dz)) / 2 / SEG))
    return straightEdges(a, { x: a.x + Math.sign(dx) * n * SEG, z: a.z + Math.sign(dz) * n * SEG })
  }
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
/** A footprint: centre, half sizes along its own axes, and how far it's turned off the grid's. */
interface Rect {
  x: number
  z: number
  hx: number
  hz: number
  /** 0 for a piece on the grid's axes (hx/hz already swapped for a quarter turn). */
  angle: number
}

/** A rectangle's own axes in the world (a piece's local X and Z, turned). */
const axesOf = (r: Rect): [[number, number], [number, number]] => {
  const c = Math.cos(r.angle)
  const s = Math.sin(r.angle)
  return [
    [c, -s],
    [s, c],
  ]
}

/** How far a rectangle reaches along a direction from its centre. */
const reachAlong = (r: Rect, [nx, nz]: [number, number]) => {
  const [u, v] = axesOf(r)
  return r.hx * Math.abs(u[0] * nx + u[1] * nz) + r.hz * Math.abs(v[0] * nx + v[1] * nz)
}

/** Overlaps must be deeper than this to count: pieces may touch, flush. */
const TOUCH = 1e-6

/**
 * Whether two footprints overlap (touching doesn't count). Axis-aligned pairs
 * compare boxes; a turned one is tested along each rectangle's axes — two
 * rectangles are apart exactly when they're apart along one of those.
 */
const rectsOverlap = (a: Rect, b: Rect) => {
  if (a.angle === 0 && b.angle === 0)
    return Math.abs(b.x - a.x) < a.hx + b.hx && Math.abs(b.z - a.z) < a.hz + b.hz
  const dx = b.x - a.x
  const dz = b.z - a.z
  return [...axesOf(a), ...axesOf(b)].every(
    (n) => Math.abs(dx * n[0] + dz * n[1]) < reachAlong(a, n) + reachAlong(b, n) - TOUCH
  )
}

const footprintRect = (type: ObjectType, rotation: number, x: number, z: number): Rect => {
  if (isDiagonal(rotation)) {
    const [wx, wz] = FOOTPRINT_CELLS[type]
    return { x, z, hx: (wx * GRID) / 2, hz: (wz * GRID) / 2, angle: rotation }
  }
  const [cx, cz] = footprintCells(type, rotation)
  return { x, z, hx: (cx * GRID) / 2, hz: (cz * GRID) / 2, angle: 0 }
}

/** Whether a piece's footprint (turned as it is) overlaps the grid square centred at (x, z). */
export const footprintOverlapsSquare = (o: SceneObject, x: number, z: number) =>
  rectsOverlap(footprintRect(o.type, o.rotation, o.x, o.z), {
    x,
    z,
    hx: GRID / 2,
    hz: GRID / 2,
    angle: 0,
  })

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
  if (r.angle !== 0 || isDiagonalEdge(e.rotation)) {
    // A turned footprint, or a diagonal wall: the wall as a line (no
    // thickness), tested along its direction, across it, and the footprint's
    // own axes.
    const [sx, sz] = edgeStep(e.rotation)
    const length = Math.hypot(sx, sz)
    const along: [number, number] = [sx / length, sz / length]
    const across: [number, number] = [-along[1], along[0]]
    const dx = r.x - e.x
    const dz = r.z - e.z
    return [along, across, ...axesOf(r)].every(
      (n) =>
        Math.abs(dx * n[0] + dz * n[1]) <
        h * Math.abs(along[0] * n[0] + along[1] * n[1]) + reachAlong(r, n) - TOUCH
    )
  }
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
const facing = (rotation: number) => ({ x: Math.sin(rotation), z: Math.cos(rotation) })

/** How near (m) a point must be to a wall's centre line to be on it. */
const ON_LINE = 0.02

/** The plain solid wall segment a point on a wall's line falls on, if any. */
const solidWallAt = (walls: SceneObject[], px: number, pz: number) =>
  walls.find((o) => {
    const [sx, sz] = edgeStep(o.rotation)
    const length = Math.hypot(sx, sz)
    const along = ((px - o.x) * sx + (pz - o.z) * sz) / length
    const across = ((px - o.x) * -sz + (pz - o.z) * sx) / length
    return Math.abs(across) <= ON_LINE && Math.abs(along) <= length / 2 + 1e-6
  })

/**
 * The solid wall segments behind a wall item's back edge (its −Z side), or
 * null unless its whole width is backed by plain solid wall (not glass, a
 * door or a window) — on a straight wall or a diagonal one. Also used to cut a
 * wall item away with its wall.
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
  // Back-edge centre, and the direction along it (the piece's local X).
  const bx = x - (f.x * d * GRID) / 2
  const bz = z - (f.z * d * GRID) / 2
  const along = { x: f.z, z: -f.x }
  const walls = objects.filter((o) => o.type === "wall")
  const ids = new Set<string>()
  // Points along the back edge, a grid step apart, each on solid wall.
  for (let i = 0; i < w; i++) {
    const off = (i - (w - 1) / 2) * SEG
    const wall = solidWallAt(walls, bx + along.x * off, bz + along.z * off)
    if (!wall) return null
    ids.add(wall.id)
  }
  return [...ids]
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
  if (isDiagonalEdge(wall.rotation)) {
    // Along the diagonal's line in half-segment steps, out from its face.
    const [sx, sz] = edgeStep(wall.rotation)
    const length = Math.hypot(sx, sz)
    const u = { x: sx / length, z: sz / length }
    const n = { x: -u.z, z: u.x }
    const side = (px - wall.x) * n.x + (pz - wall.z) * n.z >= 0 ? 1 : -1
    const step = length / 2
    const t = Math.round(((px - wall.x) * u.x + (pz - wall.z) * u.z) / step) * step
    return {
      x: wall.x + u.x * t + n.x * side * depth,
      z: wall.z + u.z * t + n.z * side * depth,
      // Facing (sin r, cos r) = out from the wall.
      rotation: Math.atan2(n.x * side, n.z * side),
    }
  }
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
    if (rectsOverlap(a, footprintRect(o.type, o.rotation, o.x, o.z))) return true
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
 * A grid square of floor inside the walls. `parts` is set when a diagonal wall
 * cuts the square and only some of it is inside: which of its four triangles
 * (between its diagonals) are — FLOOR_PART bits. Unset: the whole square.
 */
export interface FloorCell extends Cell {
  parts?: number
}
/** A square's four triangles, between its two diagonals (z grows "north"). */
export const FLOOR_PART = { south: 1, east: 2, north: 4, west: 8 } as const
const WHOLE = 15

/**
 * The SEG×SEG grid cells fully enclosed by walls/doors — i.e. the office interior,
 * for tinting the floor. Walls/doors sit on cell edges and block passage; a
 * flood-fill from the outside marks everything reachable, and whatever it can't
 * reach is "inside". Handles concave shapes and interior partitions; doors count
 * as barriers so a room stays enclosed. Each returned cell spans [x,x+SEG]×[z,z+SEG].
 */
export const enclosedCells = (objects: SceneObject[]): FloorCell[] =>
  enclosedRegions(objects).flat()

/**
 * The enclosed floor grouped into ROOMS: connected parts of the interior
 * (reachable from each other without crossing a wall/door/window). Used to
 * paint each room's floor separately.
 *
 * The flood runs over triangles — each grid square split by its two diagonals
 * into south, east, north and west — so a diagonal wall (a square's diagonal)
 * can close a room as well as one on the square's sides.
 */
export const enclosedRegions = (objects: SceneObject[]): FloorCell[][] => {
  const blockedH = new Set<string>() // `i,j` blocks cells (i,j-1) ↔ (i,j)
  const blockedV = new Set<string>() // `i,j` blocks cells (i-1,j) ↔ (i,j)
  const diagonals = new Map<string, number>() // cell `i,j` → 1 rising, 2 falling (bits)
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
      const direction = edgeDirection(e.rotation)
      if (direction === "x") {
        const i = Math.round((e.x - SEG / 2) / SEG)
        const j = Math.round(e.z / SEG)
        blockedH.add(`${i},${j}`)
        touch(i, j - 1)
        touch(i, j)
      } else if (direction === "z") {
        const i = Math.round(e.x / SEG)
        const j = Math.round((e.z - SEG / 2) / SEG)
        blockedV.add(`${i},${j}`)
        touch(i - 1, j)
        touch(i, j)
      } else {
        const i = Math.floor(e.x / SEG)
        const j = Math.floor(e.z / SEG)
        const k = `${i},${j}`
        diagonals.set(k, (diagonals.get(k) ?? 0) | (direction === "rising" ? 1 : 2))
        touch(i, j)
      }
    }
  }
  if (!Number.isFinite(minI)) return []

  // One ring of outside to flood from; triangles indexed in typed arrays.
  const loI = minI - 1
  const loJ = minJ - 1
  const width = maxI - minI + 3
  const height = maxJ - minJ + 3
  const S = 0
  const E = 1
  const N = 2
  const W = 3
  const index = (i: number, j: number, t: number) => ((i - loI) * height + (j - loJ)) * 4 + t
  const inGrid = (i: number, j: number) =>
    i >= loI && i < loI + width && j >= loJ && j < loJ + height

  /** Triangles a triangle opens onto: its cell's two neighbours, and across the cell side. */
  const neighbours = (i: number, j: number, t: number, out: [number, number, number][]) => {
    out.length = 0
    const d = diagonals.get(`${i},${j}`) ?? 0
    const isRising = (d & 1) !== 0 // SW–NE: parts S|W and N|E
    const isFalling = (d & 2) !== 0 // NW–SE: parts N|W and S|E
    const inner = (u: number, blocked: boolean) => {
      if (!blocked) out.push([i, j, u])
    }
    if (t === S) {
      inner(E, isFalling)
      inner(W, isRising)
      if (!blockedH.has(`${i},${j}`)) out.push([i, j - 1, N])
    } else if (t === E) {
      inner(S, isFalling)
      inner(N, isRising)
      if (!blockedV.has(`${i + 1},${j}`)) out.push([i + 1, j, W])
    } else if (t === N) {
      inner(E, isRising)
      inner(W, isFalling)
      if (!blockedH.has(`${i},${j + 1}`)) out.push([i, j + 1, S])
    } else {
      inner(S, isRising)
      inner(N, isFalling)
      if (!blockedV.has(`${i},${j}`)) out.push([i - 1, j, E])
    }
    return out
  }

  const outside = new Uint8Array(width * height * 4)
  const stack: [number, number, number][] = []
  const next: [number, number, number][] = []
  const visitOutside = (i: number, j: number, t: number) => {
    if (!inGrid(i, j)) return
    const k = index(i, j, t)
    if (outside[k]) return
    outside[k] = 1
    stack.push([i, j, t])
  }
  for (let i = loI; i < loI + width; i++)
    for (const j of [loJ, loJ + height - 1]) for (let t = 0; t < 4; t++) visitOutside(i, j, t)
  for (let j = loJ; j < loJ + height; j++)
    for (const i of [loI, loI + width - 1]) for (let t = 0; t < 4; t++) visitOutside(i, j, t)
  while (stack.length) {
    const [i, j, t] = stack.pop() as [number, number, number]
    for (const [ni, nj, nt] of neighbours(i, j, t, next)) visitOutside(ni, nj, nt)
  }

  // Rooms: each unvisited triangle's component, gathered per square.
  const seen = new Uint8Array(width * height * 4)
  const regions: FloorCell[][] = []
  for (let i = minI; i <= maxI; i++)
    for (let j = minJ; j <= maxJ; j++)
      for (let t = 0; t < 4; t++) {
        const k0 = index(i, j, t)
        if (outside[k0] || seen[k0]) continue
        const parts = new Map<string, FloorCell>()
        const queue: [number, number, number][] = [[i, j, t]]
        seen[k0] = 1
        while (queue.length) {
          const [ci, cj, ct] = queue.pop() as [number, number, number]
          const key = `${ci},${cj}`
          const cell = parts.get(key) ?? { x: ci * SEG, z: cj * SEG, parts: 0 }
          cell.parts = (cell.parts ?? 0) | (1 << ct)
          parts.set(key, cell)
          for (const [ni, nj, nt] of neighbours(ci, cj, ct, next)) {
            if (!inGrid(ni, nj)) continue
            const k = index(ni, nj, nt)
            if (outside[k] || seen[k]) continue
            seen[k] = 1
            queue.push([ni, nj, nt])
          }
        }
        regions.push([...parts.values()].map((c) => (c.parts === WHOLE ? { x: c.x, z: c.z } : c)))
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
  const direction = edgeDirection(o.rotation)
  const [sx, sz] = edgeStep(o.rotation)
  // Unit edges in this direction, by position → owning object.
  const owner = new Map<string, SceneObject>()
  for (const w of objects) {
    if (!isEdgeType(w.type) || edgeDirection(w.rotation) !== direction) continue
    for (const e of unitEdges(w)) owner.set(`${e.x},${e.z}`, w)
  }
  // Walk both ways from the segment (an opening, from one of its halves).
  const [start] = unitEdges(o)
  const ids = new Set<string>()
  for (const dir of [1, -1])
    for (let x = start.x, z = start.z; owner.has(`${x},${z}`); x += dir * sx, z += dir * sz) {
      const w = owner.get(`${x},${z}`) as SceneObject
      if (w.type === "wall") ids.add(w.id)
    }
  return [...ids]
}

/** The two grid nodes at the ends of a wall/door edge. */
export const edgeNodes = (o: SceneObject): [Cell, Cell] => {
  const [sx, sz] = edgeStep(o.rotation)
  const k = (isOpening(o.type) ? DOOR_SEGS : 1) / 2
  return [
    { x: o.x - k * sx, z: o.z - k * sz },
    { x: o.x + k * sx, z: o.z + k * sz },
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
 * Nodes where a corner post is needed — i.e. where wall/door edges running
 * different ways meet (corners, T- and X-junctions, a diagonal meeting a
 * straight wall). Straight-through nodes and free ends get no post, so a
 * merged straight run stays perfectly seamless.
 */
export const wallJointNodes = (objects: SceneObject[]): Cell[] => {
  const map = new Map<string, { cell: Cell; directions: Set<EdgeDirection> }>()
  for (const o of objects) {
    if (!isEdgeType(o.type)) continue
    const direction = edgeDirection(o.rotation)
    for (const n of edgeNodes(o)) {
      const k = `${n.x},${n.z}`
      const e = map.get(k) ?? { cell: n, directions: new Set<EdgeDirection>() }
      e.directions.add(direction)
      map.set(k, e)
    }
  }
  return [...map.values()].filter((e) => e.directions.size > 1).map((e) => e.cell)
}

/**
 * The furniture standing in the room that contains (x, z) — every piece whose
 * centre is on that room's floor. Empty when the point isn't inside a room.
 */
export const furnitureInRoomAt = (objects: SceneObject[], x: number, z: number): string[] => {
  const room = enclosedRegions(objects).find((r) =>
    r.some((c) => c.x <= x && x < c.x + SEG && c.z <= z && z < c.z + SEG)
  )
  if (!room) return []
  const cells = new Set(room.map((c) => `${c.x},${c.z}`))
  return objects
    .filter(
      (o) =>
        !isEdgeType(o.type) &&
        !isMarker(o.type) &&
        cells.has(`${Math.floor(o.x / SEG) * SEG},${Math.floor(o.z / SEG) * SEG}`)
    )
    .map((o) => o.id)
}
