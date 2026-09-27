import { redirect, type ActionFunctionArgs } from "react-router"
import { getCore } from "~/core/get-core"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"
import { requireProfile } from "~/utils/loader-helpers/requireProfile"

export const action = async (args: ActionFunctionArgs) => {
  const profile = await requireProfile(args, { requiredRole: Role.ADMIN })
  const core = getCore()

  await core.organization.delete({
    slug: profile.organizationSlug,
    userEmail: profile.userEmail,
  })

  return redirect("/")
}
