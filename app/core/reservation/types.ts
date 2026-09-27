import type { Day } from "~/utils/booking"

export interface Reservation {
  deskId: string
  date: Day
  userEmail: string
}

/** A booking request that can't be honoured — the message is shown to the person. */
export class ReservationError extends Error {}

/** Someone booked the same desk and day a moment earlier. */
export class ReservationRaceError extends Error {
  constructor() {
    super("Someone just booked this desk. The map has been refreshed.")
  }
}

/** Max days one request may book or cancel. */
export const MAX_DAYS_PER_REQUEST = 31
