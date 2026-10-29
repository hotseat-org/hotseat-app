import {
  GLASS_HOST,
  isEdgeType,
  isOpening,
  isWall,
  type OpeningType,
  type SceneObject,
} from "../types"
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
  px?: number,
  pz?: number
): { remove: string[]; add: Omit<SceneObject, "id">[] } | null => {
  const o = objects.find((obj) => obj.id === id)
  if (!o || !isEdgeType(o.type)) return null
  if (isOpening(o.type)) {
    const glass = o.model === GLASS_HOST
    if (o.type === kind) {
      const host = glass ? "glassWall" : "wall"
      // Filled back in with the paint of the wall round it.
      const faces = glass ? undefined : composeWallColors(objects).openings.get(o.id)
      const paint = faces ? composeFacePaint(faces) : {}
      return {
        remove: [o.id],
        add: unitEdges(o).map((e) => ({ type: host, ...e, ...paint })),
      }
    }
    // A window needs solid wall around it.
    if (kind === "window" && glass) return null
    return {
      remove: [o.id],
      add: [
        {
          type: kind,
          x: o.x,
          z: o.z,
          rotation: o.rotation,
          model: o.model,
          // Swapped, it keeps its paint.
          ...getOpeningPaint(o),
        },
      ],
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
