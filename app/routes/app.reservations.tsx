import type { LoaderArgs } from '@vercel/remix'

import { requireUser } from '~/services/session.server'

export const loader = async ({ request }: LoaderArgs) => {
  await requireUser(request)

  return null
}

export default function Index() {
  return (
    <>
      <div>
        <p>No Reservations</p>
      </div>
    </>
  )
}
