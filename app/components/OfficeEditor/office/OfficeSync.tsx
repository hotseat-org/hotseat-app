import { useLayoutEffect } from "react"
import { useBookingSync, type EditorBooking } from "../editor/useBookingSync"
import type { People } from "../people"
import { useEditorStoreApi } from "../store"
import { NO_PEOPLE } from "./store/people"

/**
 * The office's data from the app (the route): its members and the booking
 * data and actions, mirrored into the editor's store. Renders nothing.
 */
export const OfficeSync = ({ booking, people }: { booking?: EditorBooking; people?: People }) => {
  const store = useEditorStoreApi()
  // Set before the first paint, so names and tags don't pop in a frame late.
  useLayoutEffect(() => {
    store.getState().setPeople(people ?? NO_PEOPLE)
  }, [people, store])
  useBookingSync(booking, people)
  return null
}
