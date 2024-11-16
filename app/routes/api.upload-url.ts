import type { ActionFunctionArgs } from "@vercel/remix"
import { imageService } from "~/services/images"
import { requireUser } from "~/services/session.server"

export const action = async ({ request }: ActionFunctionArgs) => {
  await requireUser(request)
  return await imageService.getUploadUrl()
}
