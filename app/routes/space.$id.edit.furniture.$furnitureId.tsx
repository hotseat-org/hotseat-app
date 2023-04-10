import { Button, Card, CardBody } from '@material-tailwind/react'
import type { ActionArgs, LoaderArgs } from '@remix-run/node'
import { Form, useLoaderData } from '@remix-run/react'

import { getCore } from '~/core/get-core'

export const loader = async ({ params }: LoaderArgs) => {
  const core = getCore()
  if (!params.furnitureId) throw new Error('Missing ID in params')

  const seat = await core.seat.getByFurniture(params.furnitureId)

  return seat
}

export const action = async ({ params }: ActionArgs) => {
  const { id, furnitureId } = params

  if (!id || !furnitureId) throw new Error('Missing id or furnitureId')
  const core = getCore()

  await core.seat.create(furnitureId, id)

  return null
}

const FurnitureEditor = () => {
  const seat = useLoaderData<typeof loader>()
  return (
    <Card className="mt-2">
      <CardBody>
        <Form method="post">
          {seat ? (
            <div>{seat.furnitureId}</div>
          ) : (
            <Button type="submit">Create Seat</Button>
          )}
        </Form>
      </CardBody>
    </Card>
  )
}

export default FurnitureEditor
