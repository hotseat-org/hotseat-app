import { data, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router"
import { z } from "zod"
import { getCore } from "~/core/get-core"
import { OrganizationInviteError } from "~/core/organization/inviteMember"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"
import { requireProfile } from "~/utils/loader-helpers/requireProfile"

export const loader = async (args: LoaderFunctionArgs) => {
  const profile = await requireProfile(args, { requiredRole: Role.ADMIN })
  const core = getCore()
  const origin = new URL(args.request.url).origin

  const invites = await core.organization.getInvites({
    userEmail: profile.userEmail,
    slug: profile.organizationSlug,
  })

  return { invites, origin }
}

const Intent = z.enum(["invite", "generate", "delete-invite"])

export const action = async (args: ActionFunctionArgs) => {
  const profile = await requireProfile(args, { requiredRole: Role.ADMIN })
  const slug = profile.organizationSlug
  const formData = await args.request.formData()
  const intent = Intent.parse(formData.get("intent"))
  const core = getCore()

  switch (intent) {
    case "invite": {
      const email = z.email().safeParse(String(formData.get("email") ?? "").trim())
      if (!email.success)
        return data(
          { ok: false as const, error: "That doesn't look like an email address." },
          { status: 400 }
        )
      try {
        await core.organization.inviteMember({
          userEmail: profile.userEmail,
          slug,
          data: { email: email.data },
        })
      } catch (error) {
        if (error instanceof OrganizationInviteError)
          return data({ ok: false as const, error: error.message }, { status: 409 })
        throw error
      }
      break
    }
    case "generate":
      await core.organization.generateNewInviteLink({
        userEmail: profile.userEmail,
        organizationSlug: slug,
      })
      break
    case "delete-invite": {
      const email = z.email().parse(formData.get("email"))
      await core.organization.deleteInvite({ slug, userEmail: profile.userEmail, email })
      break
    }
  }

  return data({ ok: true })
}
