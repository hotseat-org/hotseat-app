import type { CoreContext } from "../types"
import type { Office } from "./types"
import { layoutSchema } from "~/components/OfficeEditor/schema"
import { isSeatable } from "~/components/OfficeEditor/types"
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

    const { office, cancelled } = await mainRepository.office.saveLayout({
      organizationSlug,
      slug,
      layout: objects,
      bookableDeskIds: desks.filter((d) => !d.assignee).map((d) => d.id),
      fromDay: todayIn(current.timezone),
    })

    return { office: await mappers.office.fromRepository(office), cancelled }
  }
