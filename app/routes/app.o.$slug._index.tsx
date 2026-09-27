import { LoaderFunctionArgs, redirect } from "react-router"
import { requireProfile } from "~/utils/loader-helpers/requireProfile"
import { revalidateOn } from "~/utils/revalidation"

export const loader = async (args: LoaderFunctionArgs) => {
  const profile = await requireProfile(args)
  return redirect(profile.favoriteOffice ? `offices/${profile.favoriteOffice.slug}` : "offices")
}

// A component (even an empty one) keeps this a UI route: without it React
// Router treats the file as a *resource* route, and a thrown 404 (unknown org /
// not a member) is sent as raw data instead of rendering the error page.
export default function OrgIndex() {
  return null
}

// Opening a settings/create modal over this page doesn't change its data.
export const shouldRevalidate = revalidateOn({ params: ["slug"] })
