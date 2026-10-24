import { data, type ActionFunctionArgs } from "react-router"
import { z } from "zod"
import { getCore } from "~/core/get-core"
import { requireProfile } from "~/utils/loader-helpers/requireProfile"

/**
 * Set (or with an empty `officeSlug`, clear) the member's favourite office in
 * this organization: where the app opens for them. Any member can choose theirs.
 */
export const action = async (args: ActionFunctionArgs) => {
  const profile = await requireProfile(args)
  const formData = await args.request.formData()
  const officeSlug = z.string().parse(formData.get("officeSlug") ?? "")
  const core = getCore()
  const { organizationSlug, userEmail: email } = profile
  if (!officeSlug) {
    await core.office.unsetFavorite({ organizationSlug, email })
    return data({ ok: true as const, officeSlug: null })
  }
  // An office of another organization (or a deleted one) fails the foreign key.
  try {
    await core.office.setFavorite({ slug: officeSlug, organizationSlug, email })
  } catch {
    return data({ ok: false as const, officeSlug: null }, { status: 404 })
  }
  return data({ ok: true as const, officeSlug })
}
