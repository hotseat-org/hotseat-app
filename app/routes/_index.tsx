import { Button } from '@material-tailwind/react'
import type { LoaderArgs } from '@remix-run/node'
import { Form } from '@remix-run/react'
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
      <Form method="post">
        <Button type="submit">Submit</Button>
      </Form>
    </>
  )
}

export default Index
