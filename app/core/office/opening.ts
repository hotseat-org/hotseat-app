import { officeLink } from "../notification"
import type { CoreContext } from "../types"
import { encodeNotification } from "~/i18n/notifications"
import { msg } from "~/i18n/msg"
import { LocalizedError } from "~/i18n/errors"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"
import { ALL_WEEKDAYS, isDay, isoWeekday, todayIn, type Day } from "~/utils/booking"

/** The most days closed at once (a year, near enough). */
export const MAX_CLOSED_DAYS = 366

interface OfficeAdminArgs {
  organizationSlug: string
  officeSlug: string
  /** Who's doing it: an admin of the organization. */
  userEmail: string
}

/** The office, for one of its admins (else Forbidden). */
const findOfficeForAdmin = async (
  { mainRepository }: CoreContext,
  { organizationSlug, officeSlug, userEmail }: OfficeAdminArgs
) => {
  const profile = await mainRepository.profile.find({ userEmail, organizationSlug })
  if (profile?.role !== Role.ADMIN) throw new Error("Forbidden")

  const office = await mainRepository.office.find({
    filter: { organizationSlug, slug: officeSlug },
  })
  if (!office) throw new Error("Not Found")

  return office
}

/**
 * Cancel the bookings on days the office no longer opens (and the waitlist
 * for them), telling each person which of their days went and why. How many
 * bookings were cancelled.
 */
const cancelBookingsOn = async (
  { mainRepository }: CoreContext,
  office: { organizationSlug: string; slug: string; name: string },
  days: Day[],
  reason: { key: string; params?: Record<string, unknown> }
) => {
  if (!days.length) return 0

  const scope = { organizationSlug: office.organizationSlug, officeSlug: office.slug }
  const bookings = await mainRepository.reservation.findMany({ filter: { ...scope, dates: days } })
  const byPerson = new Map<string, Day[]>()
  for (const booking of bookings)
    byPerson.set(booking.userEmail, [...(byPerson.get(booking.userEmail) ?? []), booking.date])

  for (const [userEmail, dates] of byPerson)
    await mainRepository.reservation.delete({ ...scope, userEmail, dates })

  const waiting = await mainRepository.waitlist.findMany({ ...scope, from: days[0] })
  for (const entry of waiting.filter((waited) => days.includes(waited.date)))
    await mainRepository.waitlist.remove({ ...entry, dates: [entry.date] })

  await mainRepository.notification.create({
    data: [...byPerson].map(([userEmail, dates]) => ({
      userEmail,
      organizationSlug: office.organizationSlug,
      link: officeLink(office.organizationSlug, office.slug),
      message: encodeNotification(reason.key, {
        ...reason.params,
        office: office.name,
        days: { days: [...dates].sort() },
      }),
    })),
  })

  return bookings.length
}

/** The office's closed days from today on, oldest first. */
export const listClosedDays =
  ({ mainRepository }: CoreContext) =>
  async ({ organizationSlug, officeSlug }: { organizationSlug: string; officeSlug: string }) => {
    const office = await mainRepository.office.find({
      filter: { organizationSlug, slug: officeSlug },
    })
    if (!office) return []

    return mainRepository.closedDay.findMany({
      organizationSlug,
      officeSlug,
      from: todayIn(office.timezone),
    })
  }

export class OfficeOpeningError extends LocalizedError {}

/**
 * Close the office on these days (a holiday, a move): nobody books them, and
 * bookings already made for them are cancelled, their people told why.
 */
export const closeOfficeDays =
  (context: CoreContext) =>
  async ({ dates, reason, ...args }: OfficeAdminArgs & { dates: Day[]; reason?: string }) => {
    const office = await findOfficeForAdmin(context, args)
    const today = todayIn(office.timezone)
    const days = [...new Set(dates)].filter(isDay).sort()
    if (!days.length || days.length > MAX_CLOSED_DAYS)
      throw new OfficeOpeningError("Pick between 1 and 366 days.")
    if (days[0] < today) throw new OfficeOpeningError("Days in the past can't be closed.")

    const cleanReason = reason?.trim().slice(0, 80) || null
    await context.mainRepository.closedDay.create({
      organizationSlug: office.organizationSlug,
      officeSlug: office.slug,
      dates: days,
      reason: cleanReason,
    })
    const cancelled = await cancelBookingsOn(
      context,
      office,
      days,
      cleanReason
        ? {
            key: msg("{office} is closed on {days} ({reason}): your booking was cancelled."),
            params: { reason: cleanReason },
          }
        : { key: msg("{office} is closed on {days}: your booking was cancelled.") }
    )

    return { closed: days.length, cancelled }
  }

/** Open the office again on these days (bookable as usual). */
export const reopenOfficeDays =
  (context: CoreContext) =>
  async ({ dates, ...args }: OfficeAdminArgs & { dates: Day[] }) => {
    const office = await findOfficeForAdmin(context, args)
    await context.mainRepository.closedDay.delete({
      organizationSlug: office.organizationSlug,
      officeSlug: office.slug,
      dates: dates.filter(isDay),
    })
  }

/**
 * The weekdays the office is open (ISO: 1 = Monday … 7 = Sunday). Bookings
 * already made for days it no longer opens are cancelled, their people told.
 */
export const setOfficeWeekdays =
  (context: CoreContext) =>
  async ({ weekdays, ...args }: OfficeAdminArgs & { weekdays: number[] }) => {
    const office = await findOfficeForAdmin(context, args)
    const open = ALL_WEEKDAYS.filter((day) => weekdays.includes(day))
    if (!open.length) throw new OfficeOpeningError("Keep at least one day open.")

    await context.mainRepository.office.update({
      organizationSlug: office.organizationSlug,
      slug: office.slug,
      data: { openWeekdays: open },
    })

    // Bookings from today on, on weekdays now closed.
    const upcoming = await context.mainRepository.reservation.findMany({
      filter: {
        organizationSlug: office.organizationSlug,
        officeSlug: office.slug,
        from: todayIn(office.timezone),
      },
    })
    const closedDays = [
      ...new Set(
        upcoming.map((booking) => booking.date).filter((day) => !open.includes(isoWeekday(day)))
      ),
    ].sort()

    const cancelled = await cancelBookingsOn(context, office, closedDays, {
      key: msg("{office} is now closed on {days}: your booking was cancelled."),
    })

    return { cancelled }
  }
