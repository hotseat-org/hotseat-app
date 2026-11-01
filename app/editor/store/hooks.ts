import { createContext, useContext, useMemo } from "react"
import { useStore, type StoreApi } from "zustand"
import { paintWallFaces } from "../layout"
import type { SceneObject } from "../types"
import { getAllPieces, getCollidables } from "./objects"
import type { EditorState, EditorStore } from "./state"

const EditorStoreContext = createContext<EditorStore | null>(null)

/** Provides a store instance to the editor subtree (and, bridged, into the Canvas). */
export const EditorStoreContextProvider = EditorStoreContext.Provider

export function useEditorStore<T>(selector: (state: EditorState) => T): T {
  const store = useContext(EditorStoreContext)
  if (!store) throw new Error("useEditorStore must be used within an OfficeEditor")

  return useStore(store, selector)
}

export function useEditorStoreApi(): EditorStore {
  const store = useContext(EditorStoreContext)
  if (!store) throw new Error("useEditorStoreApi must be used within an OfficeEditor")

  return store
}

/**
 * The store hooks typed with a module's own state on top of the editor's —
 * call once in the module (e.g. `useOfficeStore`), use everywhere in it.
 */
export const getModuleStoreHooks = <State extends object>() => ({
  useStore: useEditorStore as <Selected>(
    selector: (state: EditorState & State) => Selected
  ) => Selected,
  useStoreApi: useEditorStoreApi as () => StoreApi<EditorState & State>,
})

/**
 * Every piece on every floor, each with its floor — for what's about the
 * whole office (bookings, search), not the floor shown.
 */
export const useAllPieces = () => {
  const floors = useEditorStore((state) => state.floors)
  const currentFloor = useEditorStore((state) => state.currentFloor)
  const objects = useEditorStore((state) => state.objects)
  const otherFloorsPieces = useEditorStore((state) => state.otherFloorsPieces)

  return useMemo(
    () => getAllPieces({ floors, currentFloor, objects, otherFloorsPieces }),
    [floors, currentFloor, objects, otherFloorsPieces]
  )
}

/** The layout with the Paint tool's hovered walls in its colour, for drawing them. */
export const useObjectsWithPaintPreview = () => {
  const objects = useEditorStore((state) => state.objects)
  const preview = useEditorStore((state) => state.paintPreview)

  return useMemo(
    () => (preview ? paintWallFaces(objects, preview.targets, preview.color) : objects),
    [objects, preview]
  )
}

/** What a piece mustn't overlap on the shown floor (see getCollidables), kept while it's the same. */
export const useCollidables = () => {
  const objects = useEditorStore((state) => state.objects)
  const floorBlockers = useEditorStore((state) => state.floorBlockers)

  return useMemo(() => getCollidables({ objects, floorBlockers }), [objects, floorBlockers])
}

/**
 * The piece where it's shown: carried, where it's held now (see
 * heldPlacement) — the layout has it where it stood. Only the carried piece
 * follows each step.
 */
export const useHeldPiece = <Piece extends SceneObject | undefined>(piece: Piece): Piece => {
  const placement = useEditorStore((state) =>
    piece && state.carryingId === piece.id ? state.heldPlacement : null
  )

  return useMemo(
    () => (piece && placement ? { ...piece, ...placement } : piece),
    [piece, placement]
  )
}

/**
 * The pieces standing on the floor: all but one being carried (it's lifted
 * off it, and held apart from the layout — see heldPlacement). For what's
 * drawn under or around pieces: their shadows on the floor, their glows.
 */
export const useStandingObjects = () => {
  const objects = useEditorStore((state) => state.objects)
  const carryingId = useEditorStore((state) => state.carryingId)

  return useMemo(
    () => (carryingId ? objects.filter((piece) => piece.id !== carryingId) : objects),
    [objects, carryingId]
  )
}
