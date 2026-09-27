import { data, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router"
import { z } from "zod"
import { getCore } from "~/core/get-core"
import { requireUser } from "~/services/session.server"

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await requireUser(request)
  const core = getCore()

  const organizations = await core.user.getOrganizations(user.email)

  return { organizations }
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const user = await requireUser(request)
  const formData = await request.formData()
  const intent = z.enum(["leave"]).parse(formData.get("intent"))
  const core = getCore()

  if (intent === "leave") {
    const slug = z.string().parse(formData.get("slug"))
    try {
      await core.organization.leave({ organizationSlug: slug, email: user.email })
      return data({ ok: true })
    } catch (error) {
      if (error instanceof Error) return data({ error: error.message }, { status: 400 })
      throw error
    }
  }

  return data({ ok: true })
}
