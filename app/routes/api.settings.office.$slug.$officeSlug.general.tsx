import { data, redirect, type ActionFunctionArgs } from "react-router"
import { z } from "zod"
import { getCore } from "~/core/get-core"
import { OfficeNameTakenError, officeSlugForName } from "~/core/office/update"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"
import { requireProfile } from "~/utils/loader-helpers/requireProfile"

const Intent = z.enum([
  "check-name",
  "update-general",
  "set-cover",
  "delete-cover",
  "delete-office",
])

/** Office settings (admins only): details, cover, delete. */
export const action = async (args: ActionFunctionArgs) => {
  const profile = await requireProfile(args, { requiredRole: Role.ADMIN })
  const organizationSlug = profile.organizationSlug
  const slug = z.string().parse(args.params.officeSlug)
  const formData = await args.request.formData()
  const intent = Intent.parse(formData.get("intent"))
  const core = getCore()
  const who = { slug, organizationSlug, userEmail: profile.userEmail }

  switch (intent) {
    // Live check while typing: is the URL this name maps to free (or ours)?
    case "check-name": {
      const candidate = officeSlugForName(z.string().parse(formData.get("name")))
      const taken =
        !!candidate &&
        candidate !== slug &&
        !(await core.office.isAvailable(candidate, organizationSlug))
      return data({ ok: true as const, intent, slug: candidate, available: !!candidate && !taken })
    }
    case "update-general": {
      const fields = z
        .object({ name: z.string().trim().min(1), description: z.string() })
        .parse({ name: formData.get("name"), description: formData.get("description") })
      try {
        const office = await core.office.update({
          ...who,
          data: { name: fields.name, description: fields.description.trim() || null },
        })
        // The client moves to the new URL when the slug changed.
        return data({ ok: true as const, intent, slug: office.slug })
      } catch (error) {
        if (error instanceof OfficeNameTakenError)
          return data({ ok: false as const, intent, error: error.message }, { status: 409 })
        throw error
      }
    }
    case "set-cover": {
      const thumbnail = z.string().parse(formData.get("thumbnail"))
      await core.office.update({ ...who, data: { thumbnail } })
      return data({ ok: true as const, intent })
    }
    case "delete-cover": {
      await core.office.update({ ...who, data: { thumbnail: null } })
      return data({ ok: true as const, intent })
    }
    case "delete-office": {
      await core.office.delete(who)
      return redirect(`/app/o/${organizationSlug}/offices`)
    }
  }
}
