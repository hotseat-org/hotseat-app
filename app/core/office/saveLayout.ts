import { daysPhrase, deskPhrase, groupBookings, officeLink } from "../notification"
import type { CoreContext } from "../types"
import type { Office } from "./types"
import { layoutSchema } from "~/components/OfficeEditor/schema"
import { isSeatable, type ObjectType } from "~/components/OfficeEditor/types"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"
import { todayIn } from "~/utils/booking"

export interface SaveOfficeLayoutArgs {
  slug: string
  organizationSlug: string
  userEmail: string
  layout: unknown
}

/** A layout that can't be saved as-is — the message is shown in the editor. */
export class OfficeLayoutError extends Error {}

/**
 * Save an office layout (admins only — it also decides who has a permanent
 * desk). Upcoming bookings on desks that were removed, or that now have a
 * permanent resident, are cancelled in the same transaction.
 */
export const saveOfficeLayout =
  ({ mainRepository, mappers }: CoreContext) =>
  async ({
    slug,
    organizationSlug,
    userEmail,
    layout,
  }: SaveOfficeLayoutArgs): Promise<{ office: Office; cancelled: number }> => {
    const profile = await mainRepository.profile.find({ organizationSlug, userEmail })
    if (!profile || profile.role !== Role.ADMIN) throw new Error("Forbidden")

    const current = await mainRepository.office.find({ filter: { organizationSlug, slug } })
    if (!current) throw new Error("Not Found")

    const objects = layoutSchema.parse(layout)
    const desks = objects.filter((o) => isSeatable(o.type))

    // Permanent residents: org members, one desk each.
    const residents = desks.flatMap((d) => (d.assignee ? [d.assignee] : []))
    if (residents.length) {
      const members = await mainRepository.profile.findMany({ filter: { organizationSlug } })
      const emails = new Set(members.data.map((m) => m.userEmail))
      const outsider = residents.find((e) => !emails.has(e))
      if (outsider) throw new OfficeLayoutError(`${outsider} isn't a member of this organization.`)
      const twice = residents.find((e, i) => residents.indexOf(e) !== i)
      if (twice) throw new OfficeLayoutError(`${twice} is the permanent resident of two desks.`)
    }

    const today = todayIn(current.timezone)
    const byId = new Map(desks.map((d) => [d.id, d]))
    // A booking survives on a desk that still exists and is free — or on a
    // permanent desk its (unchanged) resident gave up that day.
    const [upcoming, releases] = await Promise.all([
      mainRepository.reservation.findMany({
        filter: { organizationSlug, officeSlug: slug, from: today },
      }),
      mainRepository.deskRelease.findMany({ organizationSlug, officeSlug: slug, from: today }),
    ])
    const releasedBy = new Map(releases.map((r) => [`${r.deskId}|${r.date}`, r.userEmail]))
    const keeps = (r: { deskId: string; date: string }) => {
      const desk = byId.get(r.deskId)
      if (!desk) return false
      return !desk.assignee || releasedBy.get(`${r.deskId}|${r.date}`) === desk.assignee
    }
    // Who loses what (read before the save deletes it) — they're told below.
    const lost = upcoming.filter((r) => !keeps(r))

    const { office, cancelled } = await mainRepository.office.saveLayout({
      organizationSlug,
      slug,
      layout: objects,
      cancelIds: lost.map((r) => r.id),
    })
    // Releases by someone who no longer has that desk mean nothing now.
    await mainRepository.deskRelease.deleteStale({
      organizationSlug,
      officeSlug: slug,
      residents: Object.fromEntries(desks.flatMap((d) => (d.assignee ? [[d.id, d.assignee]] : []))),
    })

    await notifyLayoutChange(mainRepository, {
      admin: userEmail,
      organizationSlug,
      office: { slug, name: current.name },
      before: Array.isArray(current.layout) ? (current.layout as Desk[]) : [],
      after: desks,
      lost,
    })

    return { office: await mappers.office.fromRepository(office), cancelled }
  }

type Desk = { id: string; type: string; label?: string; assignee?: string }

/**
 * Tell people what an admin's layout change did to them (never the admin):
 * bookings cancelled (the desk is gone, or now someone's), a permanent desk
 * given, or one taken away.
 */
const notifyLayoutChange = async (
  mainRepository: CoreContext["mainRepository"],
  {
    admin,
    organizationSlug,
    office,
    before,
    after,
    lost,
  }: {
    admin: string
    organizationSlug: string
    office: { slug: string; name: string }
    before: Desk[]
    after: Desk[]
    lost: { userEmail: string; deskId: string; date: string }[]
  }
) => {
  const link = officeLink(organizationSlug, office.slug)
  const members = await mainRepository.profile.findMany({ filter: { organizationSlug } })
  const nameOf = (email: string) =>
    members.data.find((m) => m.userEmail === email)?.displayName ?? email
  const previous = new Map(
    before.filter((d) => isSeatable(d.type as ObjectType)).map((d) => [d.id, d])
  )
  const current = new Map(after.map((d) => [d.id, d]))
  const notes: { userEmail: string; message: string }[] = []

  for (const { userEmail, deskId, days } of groupBookings(lost)) {
    const desk = current.get(deskId) ?? previous.get(deskId)
    const reason = current.get(deskId)?.assignee
      ? `it's now ${nameOf(current.get(deskId)!.assignee!)}'s permanent desk`
      : "the desk was removed"
    notes.push({
      userEmail,
      message: `Your booking of ${deskPhrase(desk?.label)} in ${office.name} on ${daysPhrase(days)} was cancelled: ${reason}.`,
    })
  }
  for (const desk of after) {
    if (desk.assignee && previous.get(desk.id)?.assignee !== desk.assignee)
      notes.push({
        userEmail: desk.assignee,
        message: `${deskPhrase(desk.label).replace(/^d/, "D")} in ${office.name} is now your permanent desk.`,
      })
  }
  const stillResident = new Set(after.flatMap((d) => (d.assignee ? [d.assignee] : [])))
  for (const desk of previous.values()) {
    if (
      desk.assignee &&
      current.get(desk.id)?.assignee !== desk.assignee &&
      !stillResident.has(desk.assignee)
    )
      notes.push({
        userEmail: desk.assignee,
        message: `Your permanent ${deskPhrase(desk.label)} in ${office.name} was released — book a desk on the days you come in.`,
      })
  }

  await mainRepository.notification.create({
    data: notes.filter((n) => n.userEmail !== admin).map((n) => ({ ...n, organizationSlug, link })),
  })
}
