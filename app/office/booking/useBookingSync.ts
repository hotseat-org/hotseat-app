import { useEffect, useLayoutEffect } from "react"
import type { People } from "../desks/people"
import type { DeskPreferences, PreferenceChange } from "../store"
import { useOfficeStore, useOfficeStoreApi } from "../store"
import {
  groupBookings,
  type BookingRow,
  type Day,
  type DeskDays,
  type OfficeOpening,
} from "~/utils/booking"
import type { OfficeTeam } from "~/utils/teams"

/** Desk booking data + actions for a real office, from the route. */
export interface EditorBooking {
  today: Day
  /** The day to show first. */
  day: Day
  from: Day
  lastDay: Day
  /** When the office is open for booking. */
  opening: OfficeOpening
  /** The organization's teams, each with its zone here. */
  teams: OfficeTeam[]
  reservations: BookingRow[]
  /** Days permanent residents gave their desks up. */
  releases: BookingRow[]
  pending: boolean
  /** Book one or more desks (a custom booking can mix desks). */
  onReserve: (picks: DeskDays[]) => void
  onCancel: (dates: Day[]) => void
  onRelease: (deskId: string, dates: Day[]) => void
  onReclaim: (deskId: string, dates: Day[]) => void
  /** Your favourites, usual desk and waitlist days. */
  preferences: DeskPreferences
  onPreference: (change: PreferenceChange) => void
}

/**
 * Mirror the route's booking data into the store (the scene reads it there).
 * Bookings are replaced only when the loader brings new ones, so an
 * optimistic change survives until the server's answer arrives. The chosen
 * day is taken once; after that the day switcher owns it — and it's kept in
 * the URL (?day=, dropped for today) so a reload or a shared link shows the
 * same day.
 */
export const useBookingSync = (booking: EditorBooking | undefined, people: People | undefined) => {
  const store = useOfficeStoreApi()
  const reservations = booking?.reservations
  const releases = booking?.releases
  // Layout effects: set before the first paint, so the bar and desk tags don't
  // pop in a frame late.
  useLayoutEffect(() => {
    if (reservations) store.getState().setBooking({ byDay: groupBookings(reservations) })
  }, [reservations, store])
  useLayoutEffect(() => {
    if (releases) store.getState().setBooking({ released: groupBookings(releases) })
  }, [releases, store])
  const preferences = booking?.preferences
  const onPreference = booking?.onPreference
  useLayoutEffect(() => {
    if (preferences) store.getState().setBooking({ preferences })
  }, [preferences, store])
  const opening = booking?.opening
  useLayoutEffect(() => {
    if (opening) store.getState().setBooking({ opening })
  }, [opening, store])
  const teams = booking?.teams
  useLayoutEffect(() => {
    if (teams) store.getState().setBooking({ teams })
  }, [teams, store])
  useLayoutEffect(() => {
    if (onPreference) store.getState().setBooking({ setPreference: onPreference })
  }, [onPreference, store])
  const { today, from, lastDay, pending, onReserve, onCancel, onRelease, onReclaim } = booking ?? {}
  const firstDay = booking?.day
  useLayoutEffect(() => {
    if (!today || !from || !lastDay || !onReserve || !onCancel || !onRelease || !onReclaim) return

    const current = store.getState().booking
    store.getState().setBooking({
      enabled: true,
      me: people?.me?.email ?? null,
      today,
      from,
      lastDay,
      day: current.enabled ? current.day : (firstDay ?? today),
      pending: !!pending,
      reserve: onReserve,
      cancel: onCancel,
      release: onRelease,
      reclaim: onReclaim,
    })
  }, [
    today,
    from,
    lastDay,
    pending,
    onReserve,
    onCancel,
    onRelease,
    onReclaim,
    firstDay,
    people,
    store,
  ])
  // Plain replaceState: no loader round-trip.
  const shownDay = useOfficeStore((state) => (state.booking.enabled ? state.booking.day : null))
  useEffect(() => {
    if (!shownDay || !today) return

    const url = new URL(window.location.href)
    if (shownDay === today) url.searchParams.delete("day")
    else url.searchParams.set("day", shownDay)
    if (url.href !== window.location.href)
      window.history.replaceState(window.history.state, "", url)
  }, [shownDay, today])
}
