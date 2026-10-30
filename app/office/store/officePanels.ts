import type { GetState, SetState } from "~/editor/store/state"

/** The office's panels: a desk's card, booking it on chosen days, Insights. */
export interface OfficePanelsSlice {
  /** Insights (admins): the dashboard's open state (its heatmap: see ViewSlice). */
  isInsightsOpen: boolean
  setInsightsOpen: (isOpen: boolean) => void
  /** View mode: the desk whose card is open (rendered in-scene, see SeatPopup). */
  seatCard: { id: string } | null
  openSeatCard: (id: string) => void
  closeSeatCard: () => void
  /** The desk whose custom booking dialog is open (picking days on a calendar). */
  customBooking: { id: string } | null
  openCustomBooking: (id: string) => void
  closeCustomBooking: () => void
}

export const createOfficePanelsSlice = (set: SetState, _get: GetState): OfficePanelsSlice => ({
  isInsightsOpen: false,
  setInsightsOpen: (isInsightsOpen) => set({ isInsightsOpen }),
  seatCard: null,
  openSeatCard: (id) => set({ seatCard: { id } }),
  closeSeatCard: () => set({ seatCard: null }),
  customBooking: null,
  openCustomBooking: (id) => set({ customBooking: { id }, seatCard: null }),
  closeCustomBooking: () => set({ customBooking: null }),
})
