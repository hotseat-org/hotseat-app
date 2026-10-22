import type { CoreContext } from "../types"
import type { Reservation } from "./types"
import type { Day } from "~/utils/booking"

export interface ListReservationsArgs {
  organizationSlug: string
  officeSlug: string
  userEmail: string
  from: Day
  to: Day
}

/** Who has booked which desk, for a range of days (members only). */
export const listReservations =
  ({ mainRepository }: CoreContext) =>
  async ({
    organizationSlug,
    officeSlug,
    userEmail,
    from,
    to,
  }: ListReservationsArgs): Promise<Reservation[]> => {
    const profile = await mainRepository.profile.find({ userEmail, organizationSlug })
    if (!profile) throw new Error("Forbidden")

    const rows = await mainRepository.reservation.findMany({
      filter: { organizationSlug, officeSlug, from, to },
    })
    return rows.map(({ deskId, date, userEmail }) => ({ deskId, date, userEmail }))
  }

/**
 * An office's bookings and desk releases for a range of days, together — for
 * a caller that has already checked membership (the office page's loader).
 */
export const listOfficeBookings =
  ({ mainRepository }: CoreContext) =>
  async ({ organizationSlug, officeSlug, from, to }: Omit<ListReservationsArgs, "userEmail">) => {
    const [rows, releases] = await Promise.all([
      mainRepository.reservation.findMany({ filter: { organizationSlug, officeSlug, from, to } }),
      mainRepository.deskRelease.findMany({ organizationSlug, officeSlug, from, to }),
    ])
    return {
      reservations: rows.map(({ deskId, date, userEmail }) => ({ deskId, date, userEmail })),
      releases: releases.map(({ deskId, date, userEmail }) => ({
        deskId,
        date: date as Day,
        userEmail,
      })),
    }
  }
