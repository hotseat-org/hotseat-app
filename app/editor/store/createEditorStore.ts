// Import everything from the "zustand" entrypoint (pre-bundled by Vite). Pulling
// createStore from "zustand/vanilla" caused a late dep re-optimize that briefly
// duplicated React and crashed useStore (blank canvas on some refreshes).
import { createStore, type StateCreator } from "zustand"
import { persist } from "zustand/middleware"
import { registerCategories } from "../catalog/categories"
import { registerItems } from "../catalog/registry"
import { registerRenderers } from "../catalog/renderers"
import type { EditorModule } from "../module"
import type { SceneObject } from "../types"
import { createFurnitureState, settleTurn } from "./furniture"
import { createHistory } from "./history"
import { composeSavedLayout, createObjectsState, splitLayout } from "./objects"
import { createPanelsState } from "./panels"
import { createSelectionState, syncSelection } from "./selection"
import type { EditorState, EditorStore, StoreHooks } from "./state"
import { createToolsState } from "./tools"
import { createViewState } from "./view"
import { createWallsState } from "./walls"
import { CORE_LAYERS, type Layers } from "./preferences"

const makeInitializer =
  (initialObjects: SceneObject[], modules: EditorModule[]): StateCreator<EditorState> =>
  (rawSet, get) => {
    // After every change: keep the selection to what exists, and settle a
    // piece turned into others once it's let go.
    const { set, state: history } = createHistory(rawSet, get, () => {
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
    // The modules' own state (each typed through defineModule).
    const moduleStates = Object.assign(
      {},
      ...modules.map((module) => module.createState?.(set, get) ?? {})
    ) as EditorState

    return {
      ...moduleStates,
      ...createObjectsState(set, get, { initialObjects, hooks }),
      ...createFurnitureState(set, get, hooks),
      ...createWallsState(set, get),
      ...createSelectionState(set, get, hooks),
      ...createToolsState(set, get),
      ...createViewState(set, get, hooks),
      ...createPanelsState(set, get),
      ...history,
    }
  }

/**
 * The modules' items join the catalogue (registering again replaces): what
 * each is goes to the items, how it looks to the renderers.
 */
const registerModuleCatalogs = (modules: EditorModule[]) => {
  for (const { catalog } of modules) {
    if (!catalog) continue

    registerItems(catalog.items ?? {})
    registerRenderers(catalog.items ?? {})
    registerCategories(catalog.categories ?? [])
  }
}

interface CreateEditorStoreOptions {
  /** localStorage key (standalone editor). Omit for DB-backed offices. */
  persistKey?: string
  /** Scene the store is born with (an office's saved layout), avoiding any load race. */
  initialObjects?: SceneObject[]
  /** The modules this editor runs with (their state and hooks). */
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
  registerModuleCatalogs(modules)
  const initializer = makeInitializer(initialObjects, modules)

  return persistKey
    ? createStore<EditorState>()(
        persist(initializer, {
          name: persistKey,
          // Only the layout is durable — tool/selection are per-session.
          // The pieces kept aside are part of the layout: saved with it.
          partialize: (state) => ({ objects: composeSavedLayout(state) }),
          // Upgrade layouts saved with old 1-unit wall segments, and keep
          // aside the pieces this editor can't show (see splitLayout).
          merge: (persisted, current) => {
            const persistedState = persisted as Partial<EditorState> | undefined

            return {
              ...current,
              ...persistedState,
              ...splitLayout(persistedState?.objects ?? composeSavedLayout(current)),
            }
          },
        })
      )
    : createStore<EditorState>()(initializer)
}
