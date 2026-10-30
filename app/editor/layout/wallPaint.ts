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
  const edge = objects.find((candidate) => candidate.id === id)
  if (!edge || !isEdgeType(edge.type)) return []

  const direction = edgeDirection(edge.rotation)
  const [stepX, stepZ] = edgeStep(edge.rotation)
  // Unit edges in this direction, by position → owning object; and the grid
  // nodes where an edge of another direction ends (a corner, a T, a cross).
  const owner = new Map<string, SceneObject>()
  const joints = new Set<string>()
  for (const segment of objects) {
    if (!isEdgeType(segment.type)) continue
    if (edgeDirection(segment.rotation) === direction)
      for (const unit of unitEdges(segment)) owner.set(`${unit.x},${unit.z}`, segment)
    else for (const node of edgeNodes(segment)) joints.add(`${node.x},${node.z}`)
  }
  // Walk both ways from the segment (an opening, from one of its halves).
  const [start] = unitEdges(edge)
  const ids = new Set<string>()
  for (const sign of [1, -1])
    for (let x = start.x, z = start.z; ; x += sign * stepX, z += sign * stepZ) {
      const segment = owner.get(`${x},${z}`)
      if (!segment || isGlassEdge(segment)) break
      if (isPaintable(segment)) ids.add(segment.id)
      if (joints.has(`${x + (sign * stepX) / 2},${z + (sign * stepZ) / 2}`)) break
    }

  return [...ids]
}

/** Paint tool, a wall: of each of these, the face looking toward `toward` (the camera). */
export const composeFacesToward = (
  objects: SceneObject[],
  ids: string[],
  toward: { x: number; z: number }
): WallPaint[] => {
  const byId = new Map(objects.map((object) => [object.id, object]))

  return ids.flatMap((id) => {
    const object = byId.get(id)
    if (!object) return []

    const side =
      Math.sin(object.rotation) * (toward.x - object.x) +
      Math.cos(object.rotation) * (toward.z - object.z)

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
  const edge = objects.find((candidate) => candidate.id === id)
  if (!edge || !isEdgeType(edge.type)) return null

  // Just off a segment's middle, to one side (and a hair along it, off the
  // diagonals a split square's parts meet on).
  const probe = (segment: SceneObject, side: number) => ({
    x: segment.x + Math.sin(segment.rotation) * 0.1 * side + Math.cos(segment.rotation) * 0.03,
    z: segment.z + Math.cos(segment.rotation) * 0.1 * side - Math.sin(segment.rotation) * 0.03,
  })
  const facing =
    Math.sign(
      Math.sin(edge.rotation) * (toward.x - edge.x) + Math.cos(edge.rotation) * (toward.z - edge.z)
    ) || 1
  const regions = rooms.map((cells) => new Map(cells.map((cell) => [`${cell.x},${cell.z}`, cell])))
  for (const side of [facing, -facing]) {
    const at = probe(edge, side)
    const room = regions.find((cells) => isInRegion(cells, at.x, at.z))
    if (!room) continue

    return objects.flatMap((segment): WallPaint[] => {
      if (!isPaintable(segment)) return []

      const [isFrontIn, isBackIn] = [1, -1].map((side) => {
        const point = probe(segment, side)

        return isInRegion(room, point.x, point.z)
      })
      if (isFrontIn && isBackIn) return [{ id: segment.id }]
      if (isFrontIn) return [{ id: segment.id, face: "front" }]
      if (isBackIn) return [{ id: segment.id, face: "back" }]

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
  const faceOf = new Map(targets.map((target) => [target.id, target.face]))
  const paint = color ?? undefined
  // A window shows its wall's paint until painted itself: one face
  // painted keeps the other as it showed.
  const shown = objects.some((object) => faceOf.has(object.id) && isOpening(object.type))
    ? composeWallColors(objects).openings
    : null

  return objects.map((object) => {
    if (!faceOf.has(object.id)) return object

    const isOpeningPaint = isOpening(object.type)
    const [front, back] = (isOpeningPaint && shown?.get(object.id)) || getWallFaces(object)
    const face = faceOf.get(object.id)
    const faces: WallFaces =
      face === "front" ? [paint, back] : face === "back" ? [front, paint] : [paint, paint]
    const paintFields = composeFacePaint(faces, isOpeningPaint)
    const repainted = { ...object, ...paintFields }
    // Drop the paint fields the new faces don't use (never a window's frame colour).
    const keys = isOpeningPaint
      ? (["colorFront", "colorBack"] as const)
      : (["color", "colorFront", "colorBack"] as const)
    for (const key of keys) if (!(key in paintFields)) delete repainted[key]

    return repainted
  })
}
