import { createBookingSlice } from "./booking"
import { createDesksSlice } from "./desks"
import { createOfficePanelsSlice } from "./officePanels"
import { createOfficeViewSlice } from "./officeView"
import { createPeopleSlice } from "./people"
import type { OfficeGetState, OfficeSetState, OfficeState } from "./state"

export const createOfficeSlice = (set: OfficeSetState, get: OfficeGetState): OfficeState => ({
  ...createDesksSlice(set, get),
  ...createBookingSlice(set, get),
  ...createOfficeViewSlice(set, get),
  ...createOfficePanelsSlice(set, get),
  ...createPeopleSlice(set, get),
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
