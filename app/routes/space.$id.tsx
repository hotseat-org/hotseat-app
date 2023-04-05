import type { LoaderArgs } from '@remix-run/node'
import { useParams } from '@remix-run/react'
import { SpaceViewer } from '~/components/SpaceView'
import { requireUser } from '~/services/session.server'

export const loader = async ({ request }: LoaderArgs) => {
  await requireUser(request)

  return null
}

const Space = () => {
  const { id } = useParams()
  return (
    <>
      <SpaceViewer spaceId={id} />
    </>
  )
}

export default Space
