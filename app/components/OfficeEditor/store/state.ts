import type { StateCreator, StoreApi } from "zustand"
import type { BookingSlice } from "./booking"
import type { DesksSlice } from "./desks"
import type { FurnitureSlice } from "./furniture"
import type { HistorySlice } from "./history"
import type { ObjectsSlice } from "./objects"
import type { PanelsSlice } from "./panels"
import type { SelectionSlice } from "./selection"
import type { ToolsSlice } from "./tools"
import type { ViewSlice } from "./view"
import type { WallsSlice } from "./walls"

/** The editor's whole state: every slice's fields and actions together. */
export type EditorState = ObjectsSlice &
  FurnitureSlice &
  WallsSlice &
  DesksSlice &
  SelectionSlice &
  ToolsSlice &
  ViewSlice &
  PanelsSlice &
  BookingSlice &
  HistorySlice

/** The store's `set` — in the slices, the one that records undo steps (see createHistory). */
export type SetState = Parameters<StateCreator<EditorState>>[0]
export type GetState = () => EditorState

export type EditorStore = StoreApi<EditorState>
