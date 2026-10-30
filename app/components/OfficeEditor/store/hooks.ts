import { createContext, useContext, useMemo } from "react"
import { useStore } from "zustand"
import { paintWallFaces } from "../layout"
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

/** The layout with the Paint tool's hovered walls in its colour, for drawing them. */
export const useObjectsWithPaintPreview = () => {
  const objects = useEditorStore((state) => state.objects)
  const preview = useEditorStore((state) => state.paintPreview)
  return useMemo(
    () => (preview ? paintWallFaces(objects, preview.targets, preview.color) : objects),
    [objects, preview]
  )
}
