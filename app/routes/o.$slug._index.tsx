import { LoaderFunctionArgs, redirect } from "@vercel/remix"
import { requireProfile } from "~/utils/loader-helpers/requireProfile"

export const loader = async (args: LoaderFunctionArgs) => {
  const profile = await requireProfile(args)
  return redirect(profile.favoriteOffice ? `office/${profile.favoriteOffice.slug}` : "offices")
}
