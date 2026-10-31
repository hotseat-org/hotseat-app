import type { BookingSlice } from "./booking"
import type { DesksSlice } from "./desks"
import type { OfficePanelsSlice } from "./officePanels"
import type { OfficeViewSlice } from "./officeView"
import type { PeopleSlice } from "./people"
import type { EditorState, GetState, SetState } from "~/editor"

/** The office's part of the editor's state: desks, booking, and what it shows and opens. */
export interface OfficeState
  extends DesksSlice, BookingSlice, OfficeViewSlice, OfficePanelsSlice, PeopleSlice {}

/** The editor's state with the office's on top. */
export type OfficeEditorState = EditorState & OfficeState

/** The store's `set` and `get` in the office's slices. */
export type OfficeSetState = SetState<OfficeEditorState>
export type OfficeGetState = GetState<OfficeEditorState>
