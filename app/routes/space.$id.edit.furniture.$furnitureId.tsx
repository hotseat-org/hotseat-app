import {
  Avatar,
  Button,
  Card,
  CardBody,
  CardHeader,
  Typography,
} from '@material-tailwind/react'
import type { ActionArgs, LoaderArgs } from '@remix-run/node'
import { Form, useLoaderData } from '@remix-run/react'

import { getCore } from '~/core/get-core'

enum ActionIntent {
  DeleteSeat = 'DeleteSeat',
  CreateSeat = 'CreateSeat',
  AssignResident = 'AssignResident',
  RemoveResident = 'RemoveResident',
}

export const loader = async ({ params }: LoaderArgs) => {
  const core = getCore()
  if (!params.furnitureId) throw new Error('Missing ID in params')

  const seat = await core.seat.getByFurniture(params.furnitureId)
  const users = await core.user.getMany()

  return { seat, users }
}

export const action = async ({ params, request }: ActionArgs) => {
  const { id, furnitureId } = params
  if (!id || !furnitureId) throw new Error('Missing id or furnitureId')

  const formData = await request.formData()
  const intent = formData.get('intent')

  const core = getCore()

  if (intent === ActionIntent.CreateSeat) {
    await core.seat.create(furnitureId, id)
  }

  if (intent === ActionIntent.DeleteSeat) {
    const seatId = formData.get('seatId')
    seatId && typeof seatId === 'string' && (await core.seat.delete(seatId))
  }

  if (intent == ActionIntent.AssignResident) {
    const seatId = formData.get('seatId')
    const userId = formData.get('userId')

    if (typeof seatId === 'string' && typeof userId === 'string') {
      await core.seat.assignResident(seatId, userId)
    }
  }

  if (intent === ActionIntent.RemoveResident) {
    const seatId = formData.get('seatId')
    seatId &&
      typeof seatId === 'string' &&
      (await core.seat.removeResident(seatId))
  }

  return null
}

const FurnitureEditor = () => {
  const { seat, users } = useLoaderData<typeof loader>()

  return (
    <Form method="post">
      {seat && (
        <>
          <input className="hidden" name="seatId" value={seat.id} />
          <Card className="mt-12">
            <CardHeader className="h-40">
              <img
                alt="An office desk with laptop"
                src="https://images.pexels.com/photos/389818/pexels-photo-389818.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
              />
            </CardHeader>
            <CardBody>
              <div className="flex justify-between">
                <div>
                  <Typography className="font-bold text-xs" variant="small">
                    Seat ID
                  </Typography>
                  <Typography className="text-xs" variant="small">
                    {seat.id}
                  </Typography>
                </div>
                <Button
                  type="submit"
                  color="red"
                  variant="text"
                  name="intent"
                  value={ActionIntent.DeleteSeat}
                >
                  Delete
                </Button>
              </div>
            </CardBody>
          </Card>

          {!seat.residentId && (
            <Card className="mt-4">
              <CardBody>
                <div className="flex flex-col gap-4">
                  <Typography>
                    This seat has no permanent resident. You can assign one.
                  </Typography>
                  <select name="userId">
                    {users.map((user) => (
                      <option
                        key={user.id}
                        value={user.id}
                        className="items-center flex gap-4"
                      >
                        <Avatar size="xs" variant="circular" src={user.photo} />{' '}
                        {user.displayName}
                      </option>
                    ))}
                  </select>
                  <Button
                    name="intent"
                    value={ActionIntent.AssignResident}
                    fullWidth
                    type="submit"
                  >
                    Assign a resident
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}

          {seat.residentId && (
            <Card className="mt-4">
              <CardBody>
                <div className="flex flex-col gap-4">
                  <Typography>This seat has a permanent resident</Typography>
                  <div className="flex gap-2 items-center">
                    {/* TODO implement */}
                    {/*<Avatar variant="circular" src={seat.resident.photo} />*/}
                    {/*{seat.resident.displayName}*/}
                  </div>
                  <select name="userId">
                    {users.map((user) => (
                      <option
                        key={user.id}
                        value={user.id}
                        className="items-center flex gap-4"
                      >
                        <Avatar size="xs" variant="circular" src={user.photo} />{' '}
                        {user.displayName}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <Button
                      color="red"
                      name="intent"
                      variant="text"
                      value={ActionIntent.RemoveResident}
                      fullWidth
                      type="submit"
                    >
                      Remove
                    </Button>
                    <Button
                      name="intent"
                      value={ActionIntent.AssignResident}
                      fullWidth
                      type="submit"
                    >
                      Change
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </>
      )}
      {!seat && (
        <Card className="mt-12">
          <CardBody>
            <div className="flex flex-col gap-2">
              <Typography>
                This furniture is not a seat, you can create it.
              </Typography>
              <Button
                name="intent"
                value={ActionIntent.CreateSeat}
                fullWidth
                type="submit"
              >
                Create a seat
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </Form>
  )
}

export default FurnitureEditor
