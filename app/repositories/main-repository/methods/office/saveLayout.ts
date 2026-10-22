import type { Office } from "../../types"
import prisma from "~/services/prisma.server"
import { Prisma } from "~/repositories/main-repository/prisma/generated/prisma-client/client"

export interface SaveOfficeLayoutArgs {
  organizationSlug: string
  slug: string
  layout: unknown
  /** Bookings to cancel with it (on desks that are gone, or now someone's). */
  cancelIds: string[]
}

/** Save the layout and, in the same transaction, cancel the given bookings. */
export const saveOfficeLayout = async ({
  organizationSlug,
  slug,
  layout,
  cancelIds,
}: SaveOfficeLayoutArgs): Promise<{ office: Office; cancelled: number }> => {
  const [{ count }, result] = await prisma.$transaction([
    prisma.reservation.deleteMany({ where: { id: { in: cancelIds } } }),
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
