import type { BookingState } from "./booking"
import type { DesksState } from "./desks"
import type { OfficePanelsState } from "./officePanels"
import type { OfficeViewState } from "./officeView"
import type { PeopleState } from "./people"
import type { EditorState, GetState, SetState } from "~/editor"

/** The office's part of the editor's state: desks, booking, and what it shows and opens. */
export interface OfficeState
  extends DesksState, BookingState, OfficeViewState, OfficePanelsState, PeopleState {}

/** The editor's state with the office's on top. */
export type OfficeEditorState = EditorState & OfficeState

/** The store's `set` and `get` where the office builds its state. */
export type OfficeSetState = SetState<OfficeEditorState>
export type OfficeGetState = GetState<OfficeEditorState>
