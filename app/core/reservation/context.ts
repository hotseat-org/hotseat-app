import type { CoreContext } from "../types"
import { parseLayout } from "~/office/schema"
import { isSeatable } from "~/office/catalog"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"
import { addDays, isOpenDay, todayIn, type Day, type OfficeOpening } from "~/utils/booking"
import { getKeepingTeam, toOfficeTeam } from "~/utils/teams"

/**
 * Shared checks for booking calls: the caller is a member, the office exists,
 * and whom the call is for (admins may act for another member).
 */
export const bookingContext = async (
  { mainRepository }: CoreContext,
  args: { organizationSlug: string; officeSlug: string; userEmail: string; forEmail?: string }
) => {
  const { organizationSlug, officeSlug, userEmail, forEmail } = args
  const profile = await mainRepository.profile.find({ userEmail, organizationSlug })
  if (!profile) throw new Error("Forbidden")

  let targetEmail = userEmail
  if (forEmail && forEmail !== userEmail) {
    if (profile.role !== Role.ADMIN) throw new Error("Forbidden")
    const target = await mainRepository.profile.find({ userEmail: forEmail, organizationSlug })
    if (!target) throw new Error("Not Found")
    targetEmail = forEmail
  }

  const office = await mainRepository.office.find({
    filter: { organizationSlug, slug: officeSlug },
  })
  if (!office) throw new Error("Not Found")

  const today = todayIn(office.timezone)
  const desks = parseLayout(office.layout).pieces.filter((o) => isSeatable(o.type))

  const lastDay = addDays(today, office.bookingWindowDays)
  // Days residents gave their desks up (bookable like any desk on those days).
  const releases = await mainRepository.deskRelease.findMany({
    organizationSlug,
    officeSlug,
    from: today,
    to: lastDay,
  })
  const released = new Set(releases.map((r) => `${r.deskId}|${r.date}`))
  const isReleased = (deskId: string, day: string) => released.has(`${deskId}|${day}`)

  // When it's open: its weekdays, less its closed days.
  const closedDays = await mainRepository.closedDay.findMany({
    organizationSlug,
    officeSlug,
    from: today,
    to: lastDay,
  })
  const opening: OfficeOpening = {
    openWeekdays: office.openWeekdays,
    closedDays: Object.fromEntries(closedDays.map((closed) => [closed.date, closed.reason ?? ""])),
  }
  const isOpen = (day: Day) => isOpenDay(day, opening)

  // Zones kept for their teams: others book their desks only shortly before.
  const teams = (await mainRepository.team.findMany({ organizationSlug }))
    .map((team) => toOfficeTeam(team, officeSlug))
    .filter((team) => team.zone && team.keepDays !== null)
  /** The team a desk is kept from someone for, that day (none: they can book it). */
  const getKeptFor = (desk: { zone?: string }, day: Day, email: string) =>
    getKeepingTeam(teams, { zone: desk.zone, day, today, email })

  return { profile, office, targetEmail, today, lastDay, desks, isReleased, isOpen, getKeptFor }
}
