import { redirect, type LoaderFunctionArgs } from "react-router"
import { requireProfile } from "~/utils/loader-helpers/requireProfile"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"
import { revalidateOn } from "~/utils/revalidation"

/**
 * Insights (admins), over the office: its own address, so it can be linked to and Back
 * closes it. The office draws it (see useOfficePanel), from its own data —
 * an admin's: anyone else lands back on the office.
 */
export const loader = async (args: LoaderFunctionArgs) => {
  const profile = await requireProfile(args)
  if (profile.role !== Role.ADMIN)
    throw redirect(`/app/o/${args.params.slug}/offices/${args.params.officeSlug}`)

  return null
}

export const shouldRevalidate = revalidateOn({ params: ["slug", "officeSlug"] })

export default function OfficePanelRoute() {
  return null
}
