import type { SeatRule } from "../findSeat/matching"
import { type OfficeGetState, type OfficeSetState } from "./state"
import {
  ALL_WEEKDAYS,
  type BookingsByDay,
  type Day,
  type DeskDays,
  type OfficeOpening,
} from "~/utils/booking"
import type { OfficeTeam } from "~/utils/teams"

/** Your desk preferences in this office (see core/reservation/preferences). */
export interface DeskPreferences {
  /** Desks you starred, in the order you starred them. */
  favorites: string[]
  /** Booked for you automatically on these ISO weekdays (1 = Monday). */
  usual: { deskId: string; weekdays: number[] } | null
  /** Days you're waiting for a desk. */
  waiting: Day[]
  /** How many wait for a desk on each day. */
  waitingByDay: Record<Day, number>
  /** What you look for when finding a seat (see findSeat). */
  seatRules: SeatRule[]
}

export const NO_PREFERENCES: DeskPreferences = {
  favorites: [],
  usual: null,
  waiting: [],
  waitingByDay: {},
  seatRules: [],
}

/** Preference changes, sent as they are to the reservations API (see its intents). */
export type PreferenceChange =
  | { intent: "favorite"; deskId: string; isFavorite: "true" | "false" }
  | { intent: "usual"; deskId: string; weekdays: string }
  | { intent: "usual-clear" }
  | { intent: "waitlist-join" | "waitlist-leave"; dates: string }
  | { intent: "seat-rules"; rules: string }

/** Desk booking state for the office view (see ~/utils/booking). */
export interface Booking {
  enabled: boolean
  /** Your email (who books). */
  me: string | null
  /** The office's today; earlier days are read-only. */
  today: Day
  /** The day being shown. */
  day: Day
  /** First and last day with data (bookable up to `lastDay`). */
  from: Day
  lastDay: Day
  /** When the office is open for booking: its weekdays, less closed days. */
  opening: OfficeOpening
  /** The organization's teams, each with its zone here. */
  teams: OfficeTeam[]
  byDay: BookingsByDay
  /** Permanent desks their resident gave up, by day (day → desk → resident). */
  released: BookingsByDay
  /** A booking request is in flight. */
  pending: boolean
  /** Book days on one or more desks (a custom booking can mix desks). */
  reserve: (picks: DeskDays[]) => void
  cancel: (dates: Day[]) => void
  /** A resident gives their desk up on days away / takes it back. */
  release: (deskId: string, dates: Day[]) => void
  reclaim: (deskId: string, dates: Day[]) => void
  preferences: DeskPreferences
  /** Star a desk, set your usual desk, join or leave a waitlist. */
  setPreference: (change: PreferenceChange) => void
}

const NO_BOOKING: Booking = {
  enabled: false,
  me: null,
  today: "",
  day: "",
  from: "",
  lastDay: "",
  opening: { openWeekdays: ALL_WEEKDAYS, closedDays: {} },
  teams: [],
  byDay: {},
  released: {},
  pending: false,
  reserve: () => {},
  cancel: () => {},
  release: () => {},
  reclaim: () => {},
  preferences: NO_PREFERENCES,
  setPreference: () => {},
}

export interface BookingState {
  /** Desk booking for a real office (disabled in the standalone editor). */
  booking: Booking
  /** Replace the booking data/callbacks (from the route). Keeps the chosen day. */
  setBooking: (patch: Partial<Booking>) => void
  setBookingDay: (day: Day) => void
  /** Optimistic: show a booking before the server confirms (it moves the person). */
  applyReserve: (deskId: string, email: string, dates: Day[]) => void
  /** Optimistic: drop a person's bookings on those days. */
  applyCancel: (email: string, dates: Day[]) => void
  /** Optimistic: star / unstar a desk before the server confirms. */
  applyFavorite: (deskId: string, isFavorite: boolean) => void
}

export const createBookingState = (set: OfficeSetState, _get: OfficeGetState): BookingState => ({
  booking: NO_BOOKING,
  setBooking: (patch) => set((state) => ({ booking: { ...state.booking, ...patch } })),
  setBookingDay: (day) => set((state) => ({ booking: { ...state.booking, day } })),
  applyReserve: (deskId, email, dates) =>
    set((state) => {
      const byDay = { ...state.booking.byDay }
      for (const date of dates) {
        const day = { ...byDay[date] }
        if (day[deskId] && day[deskId] !== email) continue // taken: the server reports it

        for (const key of Object.keys(day)) if (day[key] === email) delete day[key]
        day[deskId] = email
        byDay[date] = day
      }

      return { booking: { ...state.booking, byDay } }
    }),
  applyCancel: (email, dates) =>
    set((state) => {
      const byDay = { ...state.booking.byDay }
      for (const date of dates) {
        const day = { ...byDay[date] }
        for (const key of Object.keys(day)) if (day[key] === email) delete day[key]
        byDay[date] = day
      }

      return { booking: { ...state.booking, byDay } }
    }),
  applyFavorite: (deskId, isFavorite) =>
    set((state) => {
      const favorites = state.booking.preferences.favorites.filter((id) => id !== deskId)
      if (isFavorite) favorites.push(deskId)

      return {
        booking: { ...state.booking, preferences: { ...state.booking.preferences, favorites } },
      }
    }),
})
