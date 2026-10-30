import type { GetState, SetState } from "../store/state"
import type { SceneObject } from "../types"

/**
 * An editor module: what it adds to an editor instance (see office/module.ts).
 * The catalogue — kinds of pieces, their looks and tiles — is app-wide and
 * registered apart (catalog/); a module brings behaviour, per editor.
 */
export interface EditorModule {
  id: string
  /**
   * Its store slice: the state and actions it adds. Declare their types on
   * ModuleState (`declare module`), so the editor's state includes them.
   */
  createSlice?: (set: SetState, get: GetState) => object
  /**
   * New pieces — placed, pasted, duplicated, from a saved room — before they
   * join `existing`: what they keep of what they were copied from (a copied
   * desk gets its own label, and no resident).
   */
  prepareNewPieces?: (existing: SceneObject[], fresh: SceneObject[]) => SceneObject[]
}
