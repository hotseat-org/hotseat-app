import type { StateCreator, StoreApi } from "zustand"
import type { SceneObject } from "../types"
import type { FurnitureSlice } from "./furniture"
import type { HistorySlice } from "./history"
import type { ObjectsSlice } from "./objects"
import type { PanelsSlice } from "./panels"
import type { SelectionSlice } from "./selection"
import type { ToolsSlice } from "./tools"
import type { ViewSlice } from "./view"
import type { WallsSlice } from "./walls"
import type { Layers } from "./preferences"

/**
 * The state modules add (see EditorModule.createSlice): each extends this with
 * its slice's type (`declare module`) — the office's desks and booking, say.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ModuleState {}

/** The editor's whole state: every slice's fields and actions together. */
export interface EditorState
  extends
    ObjectsSlice,
    FurnitureSlice,
    WallsSlice,
    SelectionSlice,
    ToolsSlice,
    ViewSlice,
    PanelsSlice,
    HistorySlice,
    ModuleState {}

/** The store's `set` — in the slices, the one that records undo steps (see createHistory). */
export type SetState = Parameters<StateCreator<EditorState>>[0]
export type GetState = () => EditorState

export type EditorStore = StoreApi<EditorState>

/** What the core slices ask of the editor's modules (composed from them, see EditorModule). */
export interface StoreHooks {
  /** New pieces, before they join `existing`: what they keep of what they were copied from. */
  prepareNewPieces: (existing: SceneObject[], fresh: SceneObject[]) => SceneObject[]
  /** Every layer's default (the core's and the modules'). */
  defaultLayers: Layers
}
