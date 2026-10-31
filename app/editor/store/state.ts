import type { StateCreator, StoreApi } from "zustand"
import type { SceneObject } from "../types"
import type { FurnitureState } from "./furniture"
import type { HistoryState } from "./history"
import type { ObjectsState } from "./objects"
import type { PanelsState } from "./panels"
import type { SelectionState } from "./selection"
import type { ToolsState } from "./tools"
import type { ViewState } from "./view"
import type { WallsState } from "./walls"
import type { Layers } from "./preferences"

/** The editor's whole state: every part's fields and actions together. */
export interface EditorState
  extends
    ObjectsState,
    FurnitureState,
    WallsState,
    SelectionState,
    ToolsState,
    ViewState,
    PanelsState,
    HistoryState {}

/**
 * The store's `set` — in each part of it, the one that records undo steps
 * (see createHistory). A module's part sees its own state on top (defineModule).
 */
export type SetState<State extends EditorState = EditorState> = Parameters<StateCreator<State>>[0]
export type GetState<State extends EditorState = EditorState> = () => State

export type EditorStore = StoreApi<EditorState>

/** What the editor's own state asks of its modules (composed from them, see EditorModule). */
export interface StoreHooks {
  /** New pieces, before they join `existing`: what they keep of what they were copied from. */
  prepareNewPieces: (existing: SceneObject[], fresh: SceneObject[]) => SceneObject[]
  /** Every layer's default (the core's and the modules'). */
  defaultLayers: Layers
}
