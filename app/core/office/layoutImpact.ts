/**
 * What a new office layout does to upcoming bookings — worked out the same
 * way on the server (when it saves) and in the editor (before it saves, so
 * the admin can see who'd be affected and choose what happens to them).
 * Plain data in, plain data out: no database, no browser.
 */

export interface LayoutDesk {
  id: string
  x: number
  z: number
  label?: string
  /** Permanent resident (email). */
  assignee?: string
  /** Its floor (unset in a one-floor layout). */
  floor?: string
}

export interface UpcomingBooking {
  deskId: string
  /** YYYY-MM-DD */
  date: string
  userEmail: string
}

/** Who gave their permanent desk up on a day: `deskId|date` → resident's email. */
export type ReleasedBy = Map<string, string>

/**
 * The bookings a layout would cancel: on a desk that's gone, on a desk that
 * now has a permanent resident (unless that resident gave it up that day), or
 * by someone who now has a permanent desk of their own here.
 */
export const getLostBookings = <B extends UpcomingBooking>(
  desks: LayoutDesk[],
  bookings: B[],
  releasedBy: ReleasedBy
): B[] => {
  const byId = new Map(desks.map((d) => [d.id, d]))
  const residents = new Set(desks.flatMap((d) => (d.assignee ? [d.assignee] : [])))
  return bookings.filter((b) => {
    const desk = byId.get(b.deskId)
    if (!desk || residents.has(b.userEmail)) return true
    return !!desk.assignee && releasedBy.get(`${b.deskId}|${b.date}`) !== desk.assignee
  })
}

/** How far a desk on another floor counts as (beyond any on the same floor). */
const OTHER_FLOOR_DISTANCE = 10_000

export interface Rehoming<B extends UpcomingBooking> {
  booking: B
  /** The desk it moves to — null when none is free that day (it's cancelled). */
  to: LayoutDesk | null
}

/**
 * Where lost bookings could go instead: each to the nearest desk (to the one
 * it was on) that's free that day in the new layout. Not for someone who now
 * has a permanent desk here (theirs is waiting), nor someone already booked
 * elsewhere here that day.
 */
export const planRehoming = <B extends UpcomingBooking>({
  before,
  after,
  bookings,
  lost,
  releasedBy,
}: {
  before: LayoutDesk[]
  after: LayoutDesk[]
  bookings: B[]
  lost: B[]
  releasedBy: ReleasedBy
}): Rehoming<B>[] => {
  const lostSet = new Set(lost)
  const residents = new Set(after.flatMap((d) => (d.assignee ? [d.assignee] : [])))
  const previous = new Map(before.map((d) => [d.id, d]))
  // Taken each day: by the bookings that stay, then by each move as it's made.
  const taken = new Map<string, Set<string>>()
  const busy = new Map<string, Set<string>>() // date → who already has a desk
  const mark = (date: string, deskId: string, email: string) => {
    taken.set(date, (taken.get(date) ?? new Set()).add(deskId))
    busy.set(date, (busy.get(date) ?? new Set()).add(email))
  }
  for (const b of bookings) if (!lostSet.has(b)) mark(b.date, b.deskId, b.userEmail)

  const isFree = (desk: LayoutDesk, date: string) =>
    !taken.get(date)?.has(desk.id) &&
    (!desk.assignee || releasedBy.get(`${desk.id}|${date}`) === desk.assignee)

  // Earliest days first, so the soonest bookings get the closest desks.
  return [...lost]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((booking) => {
      if (residents.has(booking.userEmail) || busy.get(booking.date)?.has(booking.userEmail))
        return { booking, to: null }
      const from = previous.get(booking.deskId)
      const free = after.filter((d) => isFree(d, booking.date))
      // Any desk on its floor is nearer than one on another.
      const distanceFrom = (desk: LayoutDesk) =>
        from
          ? Math.hypot(desk.x - from.x, desk.z - from.z) +
            (desk.floor === from.floor ? 0 : OTHER_FLOOR_DISTANCE)
          : 0
      const to = free.sort((a, b) => distanceFrom(a) - distanceFrom(b))[0] ?? null
      if (to) mark(booking.date, to.id, booking.userEmail)
      return { booking, to }
    })
}
