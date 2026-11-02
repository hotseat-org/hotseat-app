import { type LoaderFunctionArgs } from "react-router"
import { requireProfile } from "~/utils/loader-helpers/requireProfile"
import { revalidateOn } from "~/utils/revalidation"

/**
 * Finding a seat, over the office: its own address, so it can be linked to and Back
 * closes it. The office draws it (see useOfficePanel), from its own data.
 */
export const loader = async (args: LoaderFunctionArgs) => {
  await requireProfile(args)

  return null
}

export const shouldRevalidate = revalidateOn({ params: ["slug", "officeSlug"] })

export default function OfficePanelRoute() {
  return null
}
