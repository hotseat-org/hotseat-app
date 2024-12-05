import { LoaderFunctionArgs, redirect } from "react-router"
import { requireProfile } from "~/utils/loader-helpers/requireProfile"

export const loader = async (args: LoaderFunctionArgs) => {
  const profile = await requireProfile(args)
  return redirect(profile.favoriteOffice ? `office/${profile.favoriteOffice.slug}` : "offices")
}
