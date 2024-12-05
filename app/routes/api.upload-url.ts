import type { ActionFunctionArgs } from "react-router"
import { imageService } from "~/services/images"
import { requireUser } from "~/services/session.server"

export const action = async ({ request }: ActionFunctionArgs) => {
  await requireUser(request)
  return await imageService.getUploadUrl()
}
