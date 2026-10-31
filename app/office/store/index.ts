import { createBookingState } from "./booking"
import { createDesksState } from "./desks"
import { createOfficePanelsState } from "./officePanels"
import { createOfficeViewState } from "./officeView"
import { createPeopleState } from "./people"
import type { OfficeGetState, OfficeSetState, OfficeState } from "./state"

export const createOfficeState = (set: OfficeSetState, get: OfficeGetState): OfficeState => ({
  ...createDesksState(set, get),
  ...createBookingState(set, get),
  ...createOfficeViewState(set, get),
  ...createOfficePanelsState(set, get),
  ...createPeopleState(set, get),
})

export {
  NO_PREFERENCES,
  type Booking,
  type DeskPreferences,
  type PreferenceChange,
} from "./booking"
export { asNewDesks, numberUnlabelledDesks } from "./desks"
export { useOfficeStore, useOfficeStoreApi } from "./hooks"
export type { OfficeEditorState, OfficeGetState, OfficeSetState, OfficeState } from "./state"
