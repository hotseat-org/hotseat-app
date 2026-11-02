import { data, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router"
import { z } from "zod"
import { getCore } from "~/core/get-core"
import { MAX_IMPORT } from "~/core/organization/importMembers"
import { MemberRemovalError } from "~/core/organization/leave"
import { getTranslator } from "~/i18n/locale.server"
import { translateError } from "~/i18n/errors"
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
  const core = getCore()

  // A list of people, added at once (from a CSV: see ImportMembers).
  if (formData.get("intent") === "import") {
    const people = z
      .array(
        z.object({
          email: z.string().trim().email().max(254),
          displayName: z.string().trim().max(120).optional(),
          role: z.enum(Role),
        })
      )
      .min(1)
      .max(MAX_IMPORT)
      .parse(JSON.parse(z.string().parse(formData.get("people"))))
    const result = await core.organization.importMembers({
      organizationSlug: profile.organizationSlug,
      people,
    })

    return data({ ok: true as const, intent: "import" as const, ...result })
  }

  if (formData.get("intent") === "remove") {
    const memberEmail = z.string().parse(formData.get("userEmail"))
    try {
      await core.organization.removeMember({
        userEmail: profile.userEmail,
        organizationSlug: profile.organizationSlug,
        memberEmail,
      })
    } catch (error) {
      if (error instanceof MemberRemovalError)
        return data(
          {
            ok: false as const,
            error: translateError(await getTranslator(args.request), error, "Something went wrong"),
          },
          { status: 400 }
        )
      throw error
    }
    return data({ ok: true as const })
  }

  const { role, userEmail } = z
    .object({ role: z.enum(Role), userEmail: z.string() })
    .parse(Object.fromEntries([...formData.entries()]))
  await core.organization.setMemberRole({
    slug: profile.organizationSlug,
    userEmail: profile.userEmail,
    otherUserEmail: userEmail,
    role,
  })

  return data({ ok: true as const })
}
