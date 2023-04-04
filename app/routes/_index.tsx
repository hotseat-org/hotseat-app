import type { LoaderArgs } from '@remix-run/node'
import { SpaceViewer } from '~/components/SpaceView'
import { requireUser } from '~/services/session.server'

export const loader = async ({ request }: LoaderArgs) => {
  await requireUser(request)

  return null
}

const Index = () => {
  return (
    <>
      <SpaceViewer />
    </>
  )
}

export default Index
