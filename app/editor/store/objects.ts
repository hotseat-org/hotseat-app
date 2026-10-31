import { findItem } from "../catalog/registry"
import { hasRenderer } from "../catalog/renderers"
import { edgeKey, mountWalls, normalizeEdges, unitEdges } from "../layout"
import { isEdgeType, isWallMounted, type SceneObject } from "../types"
import type { GetState, SetState, StoreHooks } from "./state"

/** The layout as a whole. */
export interface ObjectsState {
  /** What this editor shows and edits. */
  objects: SceneObject[]
  /**
   * Pieces this editor can't show — their item's module doesn't run here (a
   * layout saved by an editor with more modules): kept as they are, never
   * shown or changed, and saved back with the layout (see composeSavedLayout).
   */
  keptPieces: SceneObject[]
  /** Replace the whole scene (e.g. hydrating from a saved office layout). */
  load: (objects: SceneObject[]) => void
  clear: () => void
  /** Add a placed kit's pieces (walls it shares with the office aren't doubled): one undo step. */
  placeKit: (placed: SceneObject[]) => void
}

/** Whether this editor can show a piece: its item is registered here, with its looks. */
const canShow = (piece: SceneObject) =>
  findItem(piece.type) !== undefined && hasRenderer(piece.type)

/** A saved layout, split into what this editor shows and the pieces it keeps aside. */
export const splitLayout = (pieces: SceneObject[]) => ({
  objects: normalizeEdges(pieces.filter(canShow)),
  keptPieces: pieces.filter((piece) => !canShow(piece)),
})

/** The layout to save: what's shown, and the pieces kept aside. */
export const composeSavedLayout = ({
  objects,
  keptPieces,
}: Pick<ObjectsState, "objects" | "keptPieces">) =>
  keptPieces.length > 0 ? [...objects, ...keptPieces] : objects

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
  ...splitLayout(initialObjects),
  load: (objects) => set({ ...splitLayout(objects), selectedId: null }),
  clear: () => set({ objects: [], selectedId: null }),
  placeKit: (pieces) =>
    set((state) => {
      // A saved room's pieces this editor can't show stay out of it.
      const placed = pieces.filter(canShow)
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
