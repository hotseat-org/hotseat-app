import { showFloorOf, type OfficeGetState, type OfficeSetState } from "./state"

/**
 * The office's panels over the map: a desk's card, booking it on chosen days.
 * (The rail's modals, Insights among them, are in the URL: see useOfficePanel.)
 */
export interface OfficePanelsState {
  /** View mode: the desk whose card is open (rendered in-scene, see SeatPopup). */
  seatCard: { id: string } | null
  openSeatCard: (id: string) => void
  closeSeatCard: () => void
  /** The desk whose custom booking dialog is open (picking days on a calendar). */
  customBooking: { id: string } | null
  openCustomBooking: (id: string) => void
  closeCustomBooking: () => void
  /**
   * Opens a colleague's profile (set by the page, which owns the URL: the
   * desk card lives in the 3D scene, outside the router). Null: none to open.
   */
  showPerson: ((email: string) => void) | null
  setShowPerson: (showPerson: ((email: string) => void) | null) => void
}

export const createOfficePanelsState = (
  set: OfficeSetState,
  get: OfficeGetState
): OfficePanelsState => ({
  seatCard: null,
  openSeatCard: (id) => {
    showFloorOf(get, id)
    set({ seatCard: { id } })
  },
  closeSeatCard: () => set({ seatCard: null }),
  customBooking: null,
  openCustomBooking: (id) => set({ customBooking: { id }, seatCard: null }),
  closeCustomBooking: () => set({ customBooking: null }),
  showPerson: null,
  setShowPerson: (showPerson) => set({ showPerson }),
})
