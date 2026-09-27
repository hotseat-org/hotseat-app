import type { Office } from "../../types"
import prisma from "~/services/prisma.server"
import { Prisma } from "~/repositories/main-repository/prisma/generated/prisma-client/client"
import { toUtcDate, type Day } from "~/utils/booking"

export interface SaveOfficeLayoutArgs {
  organizationSlug: string
  slug: string
  layout: unknown
  /** Desks that can still be booked; upcoming bookings on any other desk are cancelled. */
  bookableDeskIds: string[]
  /** First day counted as upcoming (the office's today). */
  fromDay: Day
}

/**
 * Save the layout and, in the same transaction, cancel upcoming bookings on
 * desks that are gone or now have a permanent resident.
 */
export const saveOfficeLayout = async ({
  organizationSlug,
  slug,
  layout,
  bookableDeskIds,
  fromDay,
}: SaveOfficeLayoutArgs): Promise<{ office: Office; cancelled: number }> => {
  const [{ count }, result] = await prisma.$transaction([
    prisma.reservation.deleteMany({
      where: {
        organizationSlug,
        officeSlug: slug,
        date: { gte: toUtcDate(fromDay) },
        deskId: { notIn: bookableDeskIds },
      },
    }),
    prisma.office.update({
      where: { organizationSlug_slug: { organizationSlug, slug } },
      data: { layout: layout as Prisma.InputJsonValue },
    }),
  ])

  return {
    cancelled: count,
    office: {
      ...result,
      spaceId: result.spaceId ?? undefined,
      thumbnail: result.thumbnail ?? undefined,
      description: result.description ?? undefined,
      layout: result.layout ?? undefined,
    },
  }
}
