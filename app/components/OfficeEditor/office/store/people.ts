import type { People } from "../people"
import type { GetState, SetState } from "../../store/state"

/** The organization's members (desk assignment, name tags, avatars) — from the app, see OfficeSync. */
export interface PeopleSlice {
  people: People
  setPeople: (people: People) => void
}

export const NO_PEOPLE: People = { me: null, members: [] }

export const createPeopleSlice = (set: SetState, _get: GetState): PeopleSlice => ({
  people: NO_PEOPLE,
  setPeople: (people) => set({ people }),
})
