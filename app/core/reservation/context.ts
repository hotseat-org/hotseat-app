import type { CoreContext } from "../types"
import { layoutSchema } from "~/components/OfficeEditor/schema"
import { isSeatable } from "~/components/OfficeEditor/types"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"
import { addDays, todayIn } from "~/utils/booking"

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
  const parsed = layoutSchema.safeParse(office.layout ?? [])
  const desks = (parsed.success ? parsed.data : []).filter((o) => isSeatable(o.type))

  return {
    profile,
    office,
    targetEmail,
    today,
    lastDay: addDays(today, office.bookingWindowDays),
    desks,
  }
}
