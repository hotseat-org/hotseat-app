import type { ComponentType } from "react"
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
  /** What it draws in the 3D scene, and when. */
  sceneLayers?: SceneLayer[]
  /**
   * A hook: how it sees each piece right now (the office: someone's at this
   * desk on the shown day) — null when it has nothing to say. Pieces take
   * their look from it (a lived-in desk, its lamp on).
   */
  usePieceStates?: (isViewing: boolean) => ReadonlyMap<string, PieceState> | null
  /** A hook: what clicks do while viewing (the office: a desk opens its card). */
  useViewClicks?: () => ViewClicks
}

/** A module's own scene component, shown while viewing, editing, or always. */
export interface SceneLayer {
  Component: ComponentType<SceneLayerProps>
  when: "viewing" | "editing" | "always"
}

export interface SceneLayerProps {
  isEditing: boolean
  isDark: boolean
}

/** How a module sees a piece right now. */
export interface PieceState {
  /** Someone's here: the lived-in look (a desk's clutter, its monitor on). */
  isOccupied?: boolean
}

/** What clicks do while viewing. */
export interface ViewClicks {
  /** Whether a piece answers a click (a pointer cursor over it). */
  isClickable?: (object: SceneObject) => boolean
  onPiece?: (id: string) => void
  /** A click on the bare floor (not the end of a camera drag). */
  onFloor?: () => void
}
