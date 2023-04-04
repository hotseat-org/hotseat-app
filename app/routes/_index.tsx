import type { LoaderArgs } from '@remix-run/node'
import { redirect } from '@remix-run/node'

import { requireUser } from '~/services/session.server'

export const loader = async ({ request }: LoaderArgs) => {
  await requireUser(request)

  return redirect('/spaces')
}
