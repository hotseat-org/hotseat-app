import type { Cell } from "../types"
import type { GetState, SetState } from "./state"

/** What's open over the office: menus, dialogs, cards and the tour. */
export interface PanelsSlice {
  /**
   * The right-click menu: where it opens (screen px), on which piece (null:
   * the floor), and the floor point under the pointer.
   */
  contextMenu: { x: number; y: number; targetId: string | null; point: Cell } | null
  openContextMenu: (menu: NonNullable<PanelsSlice["contextMenu"]>) => void
  closeContextMenu: () => void
  /** The command search (⌘K). */
  isCommandSearchOpen: boolean
  setCommandSearchOpen: (isOpen: boolean) => void
  /** The guided tour of the editor (first run, or asked for). */
  isTourOpen: boolean
  setTourOpen: (isOpen: boolean) => void
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

export const createPanelsSlice = (set: SetState, _get: GetState): PanelsSlice => ({
  contextMenu: null,
  openContextMenu: (contextMenu) => set({ contextMenu }),
  closeContextMenu: () => set({ contextMenu: null }),
  isCommandSearchOpen: false,
  setCommandSearchOpen: (isCommandSearchOpen) => set({ isCommandSearchOpen, contextMenu: null }),
  isTourOpen: false,
  setTourOpen: (isTourOpen) => set({ isTourOpen }),
  isInsightsOpen: false,
  setInsightsOpen: (isInsightsOpen) => set({ isInsightsOpen }),
  seatCard: null,
  openSeatCard: (id) => set({ seatCard: { id } }),
  closeSeatCard: () => set({ seatCard: null }),
  customBooking: null,
  openCustomBooking: (id) => set({ customBooking: { id }, seatCard: null }),
  closeCustomBooking: () => set({ customBooking: null }),
})
