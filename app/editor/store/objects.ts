import { findItem } from "../catalog/registry"
import { hasRenderer } from "../catalog/renderers"
import { getFloorId, type Layout } from "../floors"
import { edgeKey, mountWalls, normalizeEdges, unitEdges } from "../layout"
import { isEdgeType, isWallMounted, type SceneObject } from "../types"
import { getFloorBlockers } from "../floorLinks"
import type { FloorsState } from "./floors"
import type { GetState, SetState, StoreHooks } from "./state"

/** The layout as a whole. */
export interface ObjectsState {
  /** What this editor shows and edits: the shown floor's pieces (without their floor). */
  objects: SceneObject[]
  /**
   * Pieces this editor can't show — their item's module doesn't run here (a
   * layout saved by an editor with more modules): kept as they are (each with
   * its floor), never shown or changed, and saved back with the layout (see
   * composeSavedLayout).
   */
  keptPieces: SceneObject[]
  /** Replace the whole layout (a template, the last save back). */
  load: (layout: Layout) => void
  /** Empty the shown floor. */
  clear: () => void
  /** Add a placed kit's pieces (walls it shares with the office aren't doubled): one undo step. */
  placeKit: (placed: SceneObject[]) => void
}

/** Whether this editor can show a piece: its item is registered here, with its looks. */
const canShow = (piece: SceneObject) =>
  findItem(piece.type) !== undefined && hasRenderer(piece.type)

/** A piece without its floor (one of the shown floor's, in `objects`). */
const withoutFloor = ({ floor: _floor, ...piece }: SceneObject): SceneObject => piece

/**
 * A layout split for the editor: `floorId`'s pieces shown (`objects`), the
 * other floors' aside, and the pieces it can't show kept aside too.
 */
export const splitLayout = ({ floors, pieces }: Layout, floorId = floors[0].id) => {
  const onTheirFloor = (piece: SceneObject) => ({ ...piece, floor: getFloorId(piece, floors) })
  const shown = pieces.filter(canShow).map(onTheirFloor)
  const currentFloor = floors.some((floor) => floor.id === floorId) ? floorId : floors[0].id

  return {
    floors,
    currentFloor,
    objects: normalizeEdges(
      shown.filter((piece) => piece.floor === currentFloor).map(withoutFloor)
    ),
    otherFloorsPieces: shown.filter((piece) => piece.floor !== currentFloor),
    // Stairs up from below and lifts from other floors keep their spots clear here.
    floorBlockers: getFloorBlockers(
      shown.filter((piece) => piece.floor !== currentFloor),
      floors,
      currentFloor
    ),
    keptPieces: pieces.filter((piece) => !canShow(piece)).map(onTheirFloor),
  }
}

/**
 * What a piece mustn't overlap on the shown floor: its pieces, and what
 * other floors keep clear there (stairs coming up, lift shafts).
 */
export const getCollidables = ({
  objects,
  floorBlockers,
}: Pick<ObjectsState & FloorsState, "objects" | "floorBlockers">) =>
  floorBlockers.length ? [...objects, ...floorBlockers] : objects

/**
 * Every piece on every floor, each with its floor, in floor order — the shown
 * floor's from `objects` (the pieces kept aside not among them).
 */
export const getAllPieces = ({
  floors,
  currentFloor,
  objects,
  otherFloorsPieces,
}: Pick<ObjectsState & FloorsState, "floors" | "currentFloor" | "objects" | "otherFloorsPieces">) =>
  floors.flatMap((floor) =>
    floor.id === currentFloor
      ? objects.map((piece) => ({ ...piece, floor: floor.id }))
      : otherFloorsPieces.filter((piece) => piece.floor === floor.id)
  )

/**
 * The layout to save: every floor's pieces, then the ones kept aside — in an
 * order that showing another floor doesn't change. With one floor, its
 * pieces carry none (as before there were floors).
 */
export const composeSavedLayout = (
  state: Pick<
    ObjectsState & FloorsState,
    "floors" | "currentFloor" | "objects" | "otherFloorsPieces" | "keptPieces"
  >
): Layout => {
  const pieces = [...getAllPieces(state), ...state.keptPieces]

  return {
    floors: state.floors,
    pieces: state.floors.length > 1 ? pieces : pieces.map(withoutFloor),
  }
}

/** Wall items whose wall has gone (erased, or a door cut in behind them) come down too. */
export const dropOrphanMounts = (objects: SceneObject[]) =>
  objects.some((piece) => isWallMounted(piece.type))
    ? objects.filter((piece) => !isWallMounted(piece.type) || mountWalls(objects, piece))
    : objects

export const createObjectsState = (
  set: SetState,
  get: GetState,
  { initialLayout, hooks }: { initialLayout: Layout; hooks: StoreHooks }
): ObjectsState & Pick<FloorsState, "floors" | "currentFloor" | "otherFloorsPieces"> => ({
  ...splitLayout(initialLayout),
  // On the floor shown, if it's still there.
  load: (layout) => set({ ...splitLayout(layout, get().currentFloor), selectedId: null }),
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
