import type { People } from "../desks/people"
import { type OfficeGetState, type OfficeSetState } from "./state"

/** The organization's members (desk assignment, name tags, avatars) — from the app, see OfficeSync. */
export interface PeopleState {
  people: People
  setPeople: (people: People) => void
}

export const NO_PEOPLE: People = { me: null, members: [] }

export const createPeopleState = (set: OfficeSetState, _get: OfficeGetState): PeopleState => ({
  people: NO_PEOPLE,
  setPeople: (people) => set({ people }),
})
