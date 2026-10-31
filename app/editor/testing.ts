/**
 * Testing a module without a browser: an editor's store with the module's
 * items registered and its state in place, and a way to put pieces down.
 */
import type { StoreApi } from "zustand"
import type { EditorModule } from "./module"
import { createEditorStore } from "./store"
import type { EditorState } from "./store/state"
import type { ObjectType, SceneObject } from "./types"

interface TestEditorOptions {
  /** The modules the editor runs with. */
  modules?: EditorModule[]
  /** The layout it starts with. */
  objects?: SceneObject[]
}

/**
 * An editor for a test, typed with the modules' state on top
 * (`createTestEditor<NotesState>(…)`). `place` puts a piece down as the
 * catalogue would (the modules prepare it) and returns its id.
 */
export const createTestEditor = <State extends object = object>({
  modules = [],
  objects = [],
}: TestEditorOptions = {}) => {
  const store = createEditorStore({ modules, initialObjects: objects }) as StoreApi<
    EditorState & State
  >
  const place = (
    type: ObjectType,
    { x, z, rotation = 0 }: { x: number; z: number; rotation?: number }
  ) => store.getState().addObject({ type, x, z, rotation })

  return { store, place }
}
