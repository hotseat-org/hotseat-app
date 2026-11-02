import type { ActionFunctionArgs } from "react-router"
import { isDemoVisitor } from "~/core/demo"
import { imageService } from "~/services/images"
import { requireUser } from "~/services/session.server"

export const action = async ({ request }: ActionFunctionArgs) => {
  const user = await requireUser(request)

  // Demo copies are cleared daily; their visitors don't store images.
  if (isDemoVisitor(user.email)) throw new Response(null, { status: 403 })

  return await imageService.getUploadUrl()
}
