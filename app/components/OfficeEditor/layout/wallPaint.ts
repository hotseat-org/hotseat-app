import { isEdgeType, isOpening, type SceneObject } from "../types"
import { edgeDirection, edgeNodes, edgeStep, isGlassEdge, unitEdges } from "./edges"
import { isInRegion, type FloorCell } from "./rooms"
import { composeWallColors } from "./wallColors"
import { composeFacePaint, getWallFaces, isPaintable, type WallFaces } from "./wallFaces"

/**
 * Paint tool, a wall: the wall segments on the same straight line as `id`, up
 * to the corners or junctions where other walls meet it — with the windows on
 * the way (through doors, not into glass). Returns their ids.
 */
export const wallBetweenJoints = (objects: SceneObject[], id: string): string[] => {
  const o = objects.find((obj) => obj.id === id)
  if (!o || !isEdgeType(o.type)) return []
  const direction = edgeDirection(o.rotation)
  const [sx, sz] = edgeStep(o.rotation)
  // Unit edges in this direction, by position → owning object; and the grid
  // nodes where an edge of another direction ends (a corner, a T, a cross).
  const owner = new Map<string, SceneObject>()
  const joints = new Set<string>()
  for (const w of objects) {
    if (!isEdgeType(w.type)) continue
    if (edgeDirection(w.rotation) === direction)
      for (const e of unitEdges(w)) owner.set(`${e.x},${e.z}`, w)
    else for (const n of edgeNodes(w)) joints.add(`${n.x},${n.z}`)
  }
  // Walk both ways from the segment (an opening, from one of its halves).
  const [start] = unitEdges(o)
  const ids = new Set<string>()
  for (const dir of [1, -1])
    for (let x = start.x, z = start.z; ; x += dir * sx, z += dir * sz) {
      const w = owner.get(`${x},${z}`)
      if (!w || isGlassEdge(w)) break
      if (isPaintable(w)) ids.add(w.id)
      if (joints.has(`${x + (dir * sx) / 2},${z + (dir * sz) / 2}`)) break
    }
  return [...ids]
}

/** Paint tool, a wall: of each of these, the face looking toward `toward` (the camera). */
export const composeFacesToward = (
  objects: SceneObject[],
  ids: string[],
  toward: { x: number; z: number }
): WallPaint[] => {
  const byId = new Map(objects.map((o) => [o.id, o]))
  return ids.flatMap((id) => {
    const o = byId.get(id)
    if (!o) return []
    const side = Math.sin(o.rotation) * (toward.x - o.x) + Math.cos(o.rotation) * (toward.z - o.z)
    return [{ id, face: side >= 0 ? "front" : "back" }]
  })
}

/**
 * Paint tool with Shift, a room's inside: the face looking into the room of
 * every wall segment and window round it — the room on the side of `id` that faces
 * `toward` (the camera), or its other side when that one isn't a room. A wall
 * standing inside the room gets both faces. Null when neither side is a room.
 */
export const roomWalls = (
  objects: SceneObject[],
  /** enclosedRegions(objects), worked out once by the caller. */
  rooms: FloorCell[][],
  id: string,
  toward: { x: number; z: number }
): WallPaint[] | null => {
  const o = objects.find((obj) => obj.id === id)
  if (!o || !isEdgeType(o.type)) return null
  // Just off a segment's middle, to one side (and a hair along it, off the
  // diagonals a split square's parts meet on).
  const probe = (w: SceneObject, side: number) => ({
    x: w.x + Math.sin(w.rotation) * 0.1 * side + Math.cos(w.rotation) * 0.03,
    z: w.z + Math.cos(w.rotation) * 0.1 * side - Math.sin(w.rotation) * 0.03,
  })
  const facing =
    Math.sign(Math.sin(o.rotation) * (toward.x - o.x) + Math.cos(o.rotation) * (toward.z - o.z)) ||
    1
  const regions = rooms.map((cells) => new Map(cells.map((c) => [`${c.x},${c.z}`, c])))
  for (const side of [facing, -facing]) {
    const at = probe(o, side)
    const room = regions.find((cells) => isInRegion(cells, at.x, at.z))
    if (!room) continue
    return objects.flatMap((w): WallPaint[] => {
      if (!isPaintable(w)) return []
      const [isFrontIn, isBackIn] = [1, -1].map((side) => {
        const p = probe(w, side)
        return isInRegion(room, p.x, p.z)
      })
      if (isFrontIn && isBackIn) return [{ id: w.id }]
      if (isFrontIn) return [{ id: w.id, face: "front" }]
      if (isBackIn) return [{ id: w.id, face: "back" }]
      return []
    })
  }
  return null
}

/** What the Paint tool paints: a wall, or (`face`) one face of it. */
export interface WallPaint {
  id: string
  face?: "front" | "back"
}

/** The layout with these walls (or faces) in `color` (null = the theme's). */
export const paintWallFaces = (
  objects: SceneObject[],
  targets: WallPaint[],
  color: string | null
): SceneObject[] => {
  const faceOf = new Map(targets.map((t) => [t.id, t.face]))
  const paint = color ?? undefined
  // A window shows its wall's paint until painted itself: one face
  // painted keeps the other as it showed.
  const shown = objects.some((o) => faceOf.has(o.id) && isOpening(o.type))
    ? composeWallColors(objects).openings
    : null
  return objects.map((o) => {
    if (!faceOf.has(o.id)) return o
    const isOpeningPaint = isOpening(o.type)
    const [front, back] = (isOpeningPaint && shown?.get(o.id)) || getWallFaces(o)
    const face = faceOf.get(o.id)
    const faces: WallFaces =
      face === "front" ? [paint, back] : face === "back" ? [front, paint] : [paint, paint]
    const paintFields = composeFacePaint(faces, isOpeningPaint)
    const repainted = { ...o, ...paintFields }
    // Drop the paint fields the new faces don't use (never a window's frame colour).
    const keys = isOpeningPaint
      ? (["colorFront", "colorBack"] as const)
      : (["color", "colorFront", "colorBack"] as const)
    for (const key of keys) if (!(key in paintFields)) delete repainted[key]
    return repainted
  })
}
