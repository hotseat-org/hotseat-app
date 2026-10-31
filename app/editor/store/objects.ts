import { edgeKey, mountWalls, normalizeEdges, unitEdges } from "../layout"
import { isEdgeType, isWallMounted, type SceneObject } from "../types"
import type { GetState, SetState, StoreHooks } from "./state"

/** The layout as a whole. */
export interface ObjectsState {
  objects: SceneObject[]
  /** Replace the whole scene (e.g. hydrating from a saved office layout). */
  load: (objects: SceneObject[]) => void
  clear: () => void
  /** Add a placed kit's pieces (walls it shares with the office aren't doubled): one undo step. */
  placeKit: (placed: SceneObject[]) => void
}

/** Wall items whose wall has gone (erased, or a door cut in behind them) come down too. */
export const dropOrphanMounts = (objects: SceneObject[]) =>
  objects.some((piece) => isWallMounted(piece.type))
    ? objects.filter((piece) => !isWallMounted(piece.type) || mountWalls(objects, piece))
    : objects

export const createObjectsState = (
  set: SetState,
  _get: GetState,
  { initialObjects, hooks }: { initialObjects: SceneObject[]; hooks: StoreHooks }
): ObjectsState => ({
  objects: initialObjects,
  load: (objects) => set({ objects: normalizeEdges(objects), selectedId: null }),
  clear: () => set({ objects: [], selectedId: null }),
  placeKit: (placed) =>
    set((state) => {
      const taken = new Set(
        state.objects
          .filter((piece) => isEdgeType(piece.type))
          .flatMap(unitEdges)
          .map(edgeKey)
      )
      const edges = placed.filter(
        (piece) =>
          isEdgeType(piece.type) && !unitEdges(piece).some((unit) => taken.has(edgeKey(unit)))
      )
      const furniture = hooks.prepareNewPieces(
        state.objects,
        placed.filter((piece) => !isEdgeType(piece.type))
      )

      return { objects: [...state.objects, ...edges, ...furniture] }
    }),
})
