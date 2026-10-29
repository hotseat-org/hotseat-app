import { edgeKey, mountWalls, normalizeEdges, unitEdges } from "../layout"
import { isEdgeType, isWallMounted, type SceneObject } from "../types"
import { asNewDesks } from "./desks"
import type { GetState, SetState } from "./state"

/** The layout as a whole. */
export interface ObjectsSlice {
  objects: SceneObject[]
  /** Replace the whole scene (e.g. hydrating from a saved office layout). */
  load: (objects: SceneObject[]) => void
  clear: () => void
  /** Add a placed kit's pieces (walls it shares with the office aren't doubled): one undo step. */
  placeKit: (placed: SceneObject[]) => void
}

/** Wall items whose wall has gone (erased, or a door cut in behind them) come down too. */
export const dropOrphanMounts = (objects: SceneObject[]) =>
  objects.some((o) => isWallMounted(o.type))
    ? objects.filter(
        (o) => !isWallMounted(o.type) || mountWalls(objects, o.type, o.x, o.z, o.rotation)
      )
    : objects

export const createObjectsSlice = (
  set: SetState,
  _get: GetState,
  initialObjects: SceneObject[]
): ObjectsSlice => ({
  objects: initialObjects,
  load: (objects) => set({ objects: normalizeEdges(objects), selectedId: null }),
  clear: () => set({ objects: [], selectedId: null }),
  placeKit: (placed) =>
    set((s) => {
      const taken = new Set(
        s.objects
          .filter((o) => isEdgeType(o.type))
          .flatMap(unitEdges)
          .map(edgeKey)
      )
      const edges = placed.filter(
        (o) => isEdgeType(o.type) && !unitEdges(o).some((e) => taken.has(edgeKey(e)))
      )
      const furniture = asNewDesks(
        s.objects,
        placed.filter((o) => !isEdgeType(o.type))
      )
      return { objects: [...s.objects, ...edges, ...furniture] }
    }),
})
