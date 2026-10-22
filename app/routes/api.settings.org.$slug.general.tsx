import { data, type ActionFunctionArgs } from "react-router"
import { z } from "zod"
import { getCore } from "~/core/get-core"
import { OrganizationNameTakenError, slugForName } from "~/core/organization/update"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"
import { redirectToRenamed } from "~/utils/loader-helpers/redirectToRenamed"
import { requireProfile } from "~/utils/loader-helpers/requireProfile"

const Intent = z.enum(["update-general", "check-name", "set-logo", "delete-logo"])

export const action = async (args: ActionFunctionArgs) => {
  const profile = await requireProfile(args, { requiredRole: Role.ADMIN })
  const slug = profile.organizationSlug
  const formData = await args.request.formData()
  const intent = Intent.parse(formData.get("intent"))
  const core = getCore()

  switch (intent) {
    // Live check while typing: is the URL this name maps to free (or ours)?
    case "check-name": {
      const candidate = slugForName(z.string().parse(formData.get("name")))
      const taken =
        !!candidate && candidate !== slug && !(await core.organization.isAvailable(candidate))
      return data({ ok: true as const, intent, slug: candidate, available: !!candidate && !taken })
    }
    case "update-general": {
      const updateData = z
        .object({ name: z.string().trim().min(1).optional(), description: z.string().optional() })
        .parse({ name: formData.get("name"), description: formData.get("description") })
      try {
        const org = await core.organization.update({
          slug,
          userEmail: profile.userEmail,
          data: updateData,
        })
        // A new slug: the same page under the new URL.
        if (org.slug !== slug) return redirectToRenamed(formData, "/app/o/", slug, org.slug)
        return data({ ok: true as const, intent, slug: org.slug })
      } catch (error) {
        if (error instanceof OrganizationNameTakenError)
          return data({ ok: false as const, intent, error: error.message }, { status: 409 })
        throw error
      }
    }
    case "set-logo": {
      const thumbnail = z.string().parse(formData.get("thumbnail"))
      await core.organization.update({ slug, userEmail: profile.userEmail, data: { thumbnail } })
      break
    }
    case "delete-logo": {
      await core.organization.update({
        slug,
        userEmail: profile.userEmail,
        data: { thumbnail: null },
      })
      break
    }
  }

  return data({ ok: true })
}
