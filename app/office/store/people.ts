import type { People } from "../desks/people"
import { type OfficeGetState, type OfficeSetState } from "./state"

/** The organization's members (desk assignment, name tags, avatars) — from the app, see OfficeSync. */
export interface PeopleSlice {
  people: People
  setPeople: (people: People) => void
}

export const NO_PEOPLE: People = { me: null, members: [] }

export const createPeopleSlice = (set: OfficeSetState, _get: OfficeGetState): PeopleSlice => ({
  people: NO_PEOPLE,
  setPeople: (people) => set({ people }),
})
