import { data, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router"
import { z } from "zod"
import { getCore } from "~/core/get-core"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"
import { requireProfile } from "~/utils/loader-helpers/requireProfile"

export const loader = async (args: LoaderFunctionArgs) => {
  const profile = await requireProfile(args, { requiredRole: Role.ADMIN })
  const core = getCore()

  return await core.organization.getMembers({
    userEmail: profile.userEmail,
    slug: profile.organizationSlug,
  })
}

export const action = async (args: ActionFunctionArgs) => {
  const profile = await requireProfile(args, { requiredRole: Role.ADMIN })
  const formData = await args.request.formData()
  const { role, userEmail } = z
    .object({ role: z.enum(Role), userEmail: z.string() })
    .parse(Object.fromEntries([...formData.entries()]))

  const core = getCore()
  await core.organization.setMemberRole({
    slug: profile.organizationSlug,
    userEmail: profile.userEmail,
    otherUserEmail: userEmail,
    role,
  })

  return data({ ok: true })
}
