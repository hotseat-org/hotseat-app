import {
  GLASS_HOST,
  isEdgeType,
  isOpening,
  isWall,
  type OpeningType,
  type SceneObject,
} from "../types"
import { canHost } from "../catalog/items"
import { edgeDirection, edgeStep, unitEdges } from "./edges"
import { composeWallColors } from "./wallColors"
import { composeFacePaint, getOpeningPaint } from "./wallFaces"

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
  pointX?: number,
  pointZ?: number
): { remove: string[]; add: Omit<SceneObject, "id">[] } | null => {
  const edge = objects.find((candidate) => candidate.id === id)
  if (!edge || !isEdgeType(edge.type)) return null
  if (isOpening(edge.type)) {
    const glass = edge.model === GLASS_HOST
    const host = glass ? "glassWall" : "wall"
    if (edge.type === kind) {
      // Filled back in with the paint of the wall round it.
      const faces = glass ? undefined : composeWallColors(objects).openings.get(edge.id)
      const paint = faces ? composeFacePaint(faces) : {}
      return {
        remove: [edge.id],
        add: unitEdges(edge).map((unit) => ({ type: host, ...unit, ...paint })),
      }
    }
    // Only what the wall round it takes (a window needs solid wall).
    if (!canHost(host, kind)) return null
    return {
      remove: [edge.id],
      add: [
        {
          type: kind,
          x: edge.x,
          z: edge.z,
          rotation: edge.rotation,
          model: edge.model,
          // Swapped, it keeps its paint.
          ...getOpeningPaint(edge),
        },
      ],
    }
  }
  if (!isWall(edge.type) || !canHost(edge.type, kind)) return null
  const direction = edgeDirection(edge.rotation)
  const [stepX, stepZ] = edgeStep(edge.rotation)
  // The cursor's side of the segment, along the line, is tried first.
  const cursorAlong =
    pointX !== undefined && pointZ !== undefined
      ? (pointX - edge.x) * stepX + (pointZ - edge.z) * stepZ
      : 0
  const first = cursorAlong < 0 ? -1 : 1
  for (const side of [first, -first]) {
    const nextX = edge.x + side * stepX
    const nextZ = edge.z + side * stepZ
    const partner = objects.find(
      (candidate) =>
        candidate.type === edge.type &&
        edgeDirection(candidate.rotation) === direction &&
        candidate.x === nextX &&
        candidate.z === nextZ
    )
    if (!partner) continue
    return {
      remove: [edge.id, partner.id],
      add: [
        {
          type: kind,
          x: (edge.x + nextX) / 2,
          z: (edge.z + nextZ) / 2,
          rotation: edge.rotation,
          ...(edge.type === "glassWall" && { model: GLASS_HOST }),
        },
      ],
    }
  }
  return null
}
