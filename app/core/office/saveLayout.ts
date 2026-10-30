import { groupBookings, officeLink } from "../notification"
import type { CoreContext } from "../types"
import type { Office } from "./types"
import { getLostBookings, planRehoming } from "./layoutImpact"
import { layoutSchema } from "~/components/OfficeEditor/office/schema"
import { type ObjectType } from "~/components/OfficeEditor/types"
import { isSeatable } from "~/components/OfficeEditor/office/catalog"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"
import { todayIn } from "~/utils/booking"
import { LocalizedError } from "~/i18n/errors"
import { encodeNotification } from "~/i18n/notifications"

export interface SaveOfficeLayoutArgs {
  slug: string
  organizationSlug: string
  userEmail: string
  layout: unknown
  /**
   * Bookings the new layout takes away are moved to the nearest free desk that
   * day instead of just cancelled (where one is free) — see planRehoming.
   */
  shouldRehome?: boolean
}

/** A layout that can't be saved as-is — the message is shown in the editor. */
export class OfficeLayoutError extends LocalizedError {}

/**
 * Save an office layout (admins only — it also decides who has a permanent
 * desk). Upcoming bookings on desks that were removed, or that now have a
 * permanent resident, are cancelled in the same transaction — or, asked to
 * (`shouldRehome`), moved to the nearest free desk that day where there is one.
 */
export const saveOfficeLayout =
  ({ mainRepository, mappers }: CoreContext) =>
  async ({
    slug,
    organizationSlug,
    userEmail,
    layout,
    shouldRehome = false,
  }: SaveOfficeLayoutArgs): Promise<{ office: Office; cancelled: number; moved: number }> => {
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
      if (outsider)
        throw new OfficeLayoutError("{email} isn't a member of this organization.", {
          email: outsider,
        })
      const twice = residents.find((e, i) => residents.indexOf(e) !== i)
      if (twice)
        throw new OfficeLayoutError("{email} is the permanent resident of two desks.", {
          email: twice,
        })
    }

    const today = todayIn(current.timezone)
    // A booking survives on a desk that still exists and is free — or on a
    // permanent desk its (unchanged) resident gave up that day.
    const [upcoming, releases] = await Promise.all([
      mainRepository.reservation.findMany({
        filter: { organizationSlug, officeSlug: slug, from: today },
      }),
      mainRepository.deskRelease.findMany({ organizationSlug, officeSlug: slug, from: today }),
    ])
    const releasedBy = new Map(releases.map((r) => [`${r.deskId}|${r.date}`, r.userEmail]))
    // Who loses what (read before the save deletes it) — they're told below.
    const lost = getLostBookings(desks, upcoming, releasedBy)
    const before = Array.isArray(current.layout) ? (current.layout as Desk[]) : []
    const moves = shouldRehome
      ? planRehoming({
          before: before
            .filter((d) => isSeatable(d.type as ObjectType))
            .map((d) => ({ ...d, x: d.x ?? 0, z: d.z ?? 0 })),
          after: desks,
          bookings: upcoming,
          lost,
          releasedBy,
        }).filter((m) => m.to)
      : []

    const { office, cancelled } = await mainRepository.office.saveLayout({
      organizationSlug,
      slug,
      layout: objects,
      cancelIds: lost.map((r) => r.id),
    })
    // The moves: each to its new desk (the old booking went with the save).
    // A desk taken meanwhile leaves that one simply cancelled.
    const movedTo = new Map<string, Desk>() // reservation id → its new desk
    for (const { booking, to } of moves) {
      if (!to) continue
      const result = await mainRepository.reservation.book({
        organizationSlug,
        officeSlug: slug,
        deskId: to.id,
        userEmail: booking.userEmail,
        createdByEmail: userEmail,
        dates: [booking.date],
        seriesId: null,
      })
      if (result.booked.length)
        movedTo.set(booking.id, { id: to.id, type: "workstation", label: to.label })
    }
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
      before,
      after: desks,
      lost,
      movedTo,
    })

    return {
      office: await mappers.office.fromRepository(office),
      cancelled: cancelled - movedTo.size,
      moved: movedTo.size,
    }
  }

type Desk = { id: string; type: string; x?: number; z?: number; label?: string; assignee?: string }

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
    movedTo,
  }: {
    admin: string
    organizationSlug: string
    office: { slug: string; name: string }
    before: Desk[]
    after: Desk[]
    lost: { id: string; userEmail: string; deskId: string; date: string }[]
    /** Lost bookings moved to another desk instead (reservation id → its new desk). */
    movedTo: Map<string, Desk>
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

  // Moved: one note per person and new desk.
  const moves = new Map<
    string,
    { userEmail: string; from: Desk | undefined; to: Desk; days: string[] }
  >()
  for (const r of lost) {
    const to = movedTo.get(r.id)
    if (!to) continue
    const k = `${r.userEmail}|${to.id}`
    const entry = moves.get(k) ?? {
      userEmail: r.userEmail,
      from: current.get(r.deskId) ?? previous.get(r.deskId),
      to,
      days: [],
    }
    entry.days.push(r.date)
    moves.set(k, entry)
  }
  for (const m of moves.values())
    notes.push({
      userEmail: m.userEmail,
      message: encodeNotification(
        "Your booking of {desk} in {office} on {days} moved to {newDesk}: the layout changed.",
        {
          desk: { desk: m.from?.label ?? null },
          office: office.name,
          days: { days: [...m.days].sort() },
          newDesk: { desk: m.to.label ?? null },
        }
      ),
    })

  for (const { userEmail, deskId, days } of groupBookings(lost.filter((r) => !movedTo.has(r.id)))) {
    const desk = current.get(deskId) ?? previous.get(deskId)
    const ownDesk = after.find((d) => d.assignee === userEmail)
    const booking = { desk: { desk: desk?.label ?? null }, office: office.name, days: { days } }
    const resident = current.get(deskId)?.assignee
    notes.push({
      userEmail,
      message: ownDesk
        ? encodeNotification(
            "Your booking of {desk} in {office} on {days} was cancelled: you have a permanent desk here now ({own}).",
            { ...booking, own: { desk: ownDesk.label ?? null } }
          )
        : resident
          ? encodeNotification(
              "Your booking of {desk} in {office} on {days} was cancelled: it's now {name}'s permanent desk.",
              { ...booking, name: nameOf(resident) }
            )
          : encodeNotification(
              "Your booking of {desk} in {office} on {days} was cancelled: the desk was removed.",
              booking
            ),
    })
  }
  for (const desk of after) {
    if (desk.assignee && previous.get(desk.id)?.assignee !== desk.assignee)
      notes.push({
        userEmail: desk.assignee,
        message: encodeNotification("You now have a permanent desk in {office}: {desk}.", {
          office: office.name,
          desk: { desk: desk.label ?? null },
        }),
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
        message: encodeNotification(
          "Your permanent desk in {office} ({desk}) was released — book a desk on the days you come in.",
          { office: office.name, desk: { desk: desk.label ?? null } }
        ),
      })
  }

  await mainRepository.notification.create({
    data: notes.filter((n) => n.userEmail !== admin).map((n) => ({ ...n, organizationSlug, link })),
  })
}
