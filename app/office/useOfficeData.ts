import { useLayoutEffect } from "react"
import { useBookingSync, type EditorBooking } from "./booking/useBookingSync"
import type { People } from "./desks/people"
import { NO_PEOPLE } from "./store/people"
import { useEditorStoreApi } from "~/editor"

/** What the app (the route) passes the office: omitted in the standalone editor. */
export interface OfficeData {
  /** Org members (desk assignment and name tags). */
  people?: People
  /** Desk booking data and actions for a real office. */
  booking?: EditorBooking
}

/** The office's data from the app, mirrored into the editor's store. */
export const useOfficeData = ({ people, booking }: OfficeData = {}) => {
  const store = useEditorStoreApi()
  // Set before the first paint, so names and tags don't pop in a frame late.
  useLayoutEffect(() => {
    store.getState().setPeople(people ?? NO_PEOPLE)
  }, [people, store])
  useBookingSync(booking, people)
}
