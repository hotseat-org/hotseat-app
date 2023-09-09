import type { ActionArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import { imageService } from '~/services/images'
import { requireUser } from '~/services/session.server'

export const action = async ({ request }: ActionArgs) => {
  await requireUser(request)
  return json(await imageService.getUploadUrl())
}
