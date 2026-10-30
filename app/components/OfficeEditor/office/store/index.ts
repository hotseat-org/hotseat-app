import type { GetState, SetState } from "../../store/state"
import { createBookingSlice, type BookingSlice } from "./booking"
import { createDesksSlice, type DesksSlice } from "./desks"
import { createOfficePanelsSlice, type OfficePanelsSlice } from "./officePanels"
import { createOfficeViewSlice, type OfficeViewSlice } from "./officeView"
import { createPeopleSlice, type PeopleSlice } from "./people"

/** The office's part of the editor's state: desks, booking, and what it shows and opens. */
export interface OfficeState
  extends DesksSlice, BookingSlice, OfficeViewSlice, OfficePanelsSlice, PeopleSlice {}

declare module "../../store/state" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ModuleState extends OfficeState {}
}

export const createOfficeSlice = (set: SetState, get: GetState): OfficeState => ({
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
