// Import everything from the "zustand" entrypoint (pre-bundled by Vite). Pulling
// createStore from "zustand/vanilla" caused a late dep re-optimize that briefly
// duplicated React and crashed useStore (blank canvas on some refreshes).
import { createStore, type StateCreator } from "zustand"
import { persist } from "zustand/middleware"
import { normalizeEdges } from "../layout"
import type { EditorModule } from "../module"
import type { SceneObject } from "../types"
import { createFurnitureSlice, settleTurn } from "./furniture"
import { createHistory } from "./history"
import { createObjectsSlice } from "./objects"
import { createPanelsSlice } from "./panels"
import { createSelectionSlice, syncSelection } from "./selection"
import type { EditorState, EditorStore, StoreHooks } from "./state"
import { createToolsSlice } from "./tools"
import { createViewSlice } from "./view"
import { createWallsSlice } from "./walls"
import { CORE_LAYERS, type Layers } from "./preferences"

const makeInitializer =
  (initialObjects: SceneObject[], modules: EditorModule[]): StateCreator<EditorState> =>
  (rawSet, get) => {
    // After every change: keep the selection to what exists, and settle a
    // piece turned into others once it's let go.
    const { set, slice: history } = createHistory(rawSet, get, () => {
      syncSelection(rawSet, get)
      settleTurn(rawSet, get)
    })
    const hooks: StoreHooks = {
      // Each module in turn, the pieces as the one before left them.
      prepareNewPieces: (existing, fresh) =>
        modules.reduce(
          (pieces, module) => module.prepareNewPieces?.(existing, pieces) ?? pieces,
          fresh
        ),
      defaultLayers: {
        ...CORE_LAYERS,
        ...Object.fromEntries(
          modules
            .flatMap((module) => module.mapLayers ?? [])
            .map((layer) => [layer.id, layer.isOnByDefault])
        ),
      } as Layers,
    }
    // The modules' slices: typed through ModuleState, which each one extends.
    const moduleSlices = Object.assign(
      {},
      ...modules.map((module) => module.createSlice?.(set, get) ?? {})
    ) as EditorState

    return {
      ...moduleSlices,
      ...createObjectsSlice(set, get, hooks, initialObjects),
      ...createFurnitureSlice(set, get, hooks),
      ...createWallsSlice(set, get),
      ...createSelectionSlice(set, get, hooks),
      ...createToolsSlice(set, get),
      ...createViewSlice(set, get, hooks),
      ...createPanelsSlice(set, get),
      ...history,
    }
  }

interface CreateEditorStoreOptions {
  /** localStorage key (standalone editor). Omit for DB-backed offices. */
  persistKey?: string
  /** Scene the store is born with (an office's saved layout), avoiding any load race. */
  initialObjects?: SceneObject[]
  /** The modules this editor runs with (their slices and hooks). */
  modules?: EditorModule[]
}

/**
 * Create a fresh, isolated editor store — each editor instance gets its own, so
 * offices never share scene data. The store starts already populated with
 * `initialObjects` (no post-mount hydration, no empty-render race).
 */
export const createEditorStore = ({
  persistKey,
  initialObjects = [],
  modules = [],
}: CreateEditorStoreOptions = {}): EditorStore => {
  const initializer = makeInitializer(normalizeEdges(initialObjects), modules)

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
