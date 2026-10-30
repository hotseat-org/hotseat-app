// Import everything from the "zustand" entrypoint (pre-bundled by Vite). Pulling
// createStore from "zustand/vanilla" caused a late dep re-optimize that briefly
// duplicated React and crashed useStore (blank canvas on some refreshes).
import { createStore, type StateCreator } from "zustand"
import { persist } from "zustand/middleware"
import { normalizeEdges } from "../layout"
import type { SceneObject } from "../types"
import { createBookingSlice } from "./booking"
import { createDesksSlice } from "./desks"
import { createFurnitureSlice, settleTurn } from "./furniture"
import { createHistory } from "./history"
import { createObjectsSlice } from "./objects"
import { createPanelsSlice } from "./panels"
import { createSelectionSlice, syncSelection } from "./selection"
import type { EditorState, EditorStore } from "./state"
import { createToolsSlice } from "./tools"
import { createViewSlice } from "./view"
import { createWallsSlice } from "./walls"

const makeInitializer =
  (initialObjects: SceneObject[]): StateCreator<EditorState> =>
  (rawSet, get) => {
    // After every change: keep the selection to what exists, and settle a
    // piece turned into others once it's let go.
    const { set, slice: history } = createHistory(rawSet, get, () => {
      syncSelection(rawSet, get)
      settleTurn(rawSet, get)
    })
    return {
      ...createObjectsSlice(set, get, initialObjects),
      ...createFurnitureSlice(set, get),
      ...createWallsSlice(set, get),
      ...createDesksSlice(set, get),
      ...createSelectionSlice(set, get),
      ...createToolsSlice(set, get),
      ...createViewSlice(set, get),
      ...createPanelsSlice(set, get),
      ...createBookingSlice(set, get),
      ...history,
    }
  }

interface CreateEditorStoreOptions {
  /** localStorage key (standalone editor). Omit for DB-backed offices. */
  persistKey?: string
  /** Scene the store is born with (an office's saved layout), avoiding any load race. */
  initialObjects?: SceneObject[]
}

/**
 * Create a fresh, isolated editor store — each editor instance gets its own, so
 * offices never share scene data. The store starts already populated with
 * `initialObjects` (no post-mount hydration, no empty-render race).
 */
export const createEditorStore = ({
  persistKey,
  initialObjects = [],
}: CreateEditorStoreOptions = {}): EditorStore => {
  const initializer = makeInitializer(normalizeEdges(initialObjects))
  return persistKey
    ? createStore<EditorState>()(
        persist(initializer, {
          name: persistKey,
          // Only the layout is durable — tool/selection are per-session.
          partialize: (state) => ({ objects: state.objects }),
          // Upgrade layouts saved with old 1-unit wall segments.
          merge: (persisted, current) => {
            const persistedState = persisted as Partial<EditorState> | undefined
            return {
              ...current,
              ...persistedState,
              objects: normalizeEdges(persistedState?.objects ?? current.objects),
            }
          },
        })
      )
    : createStore<EditorState>()(initializer)
}
