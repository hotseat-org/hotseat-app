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
    HistorySlice {}

/**
 * The store's `set` — in the slices, the one that records undo steps (see
 * createHistory). A module's slice sees its own state on top (defineModule).
 */
export type SetState<State extends EditorState = EditorState> = Parameters<StateCreator<State>>[0]
export type GetState<State extends EditorState = EditorState> = () => State

export type EditorStore = StoreApi<EditorState>

/** What the core slices ask of the editor's modules (composed from them, see EditorModule). */
export interface StoreHooks {
  /** New pieces, before they join `existing`: what they keep of what they were copied from. */
  prepareNewPieces: (existing: SceneObject[], fresh: SceneObject[]) => SceneObject[]
  /** Every layer's default (the core's and the modules'). */
  defaultLayers: Layers
}
