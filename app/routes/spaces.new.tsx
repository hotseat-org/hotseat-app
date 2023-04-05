import {
  Dialog,
  Button,
  Input,
  CardHeader,
  CardBody,
  CardFooter,
  Card,
  Textarea,
} from '@material-tailwind/react'
import type { LoaderArgs } from '@remix-run/node'
import { Form, Link } from '@remix-run/react'
import { requireUser } from '~/services/session.server'

export const loader = async ({ request }: LoaderArgs) => {
  await requireUser(request)

  return null
}

const Space = () => {
  return (
    <Dialog size="xs" open handler={() => {}}>
      <Card>
        <CardHeader className="h-56">
          <img
            src="https://images.pexels.com/photos/4125267/pexels-photo-4125267.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
            alt="img-blur-shadow"
            className="h-full w-full"
          />
        </CardHeader>
        <CardBody>
          <Form>
            <div className="flex gap-5 flex-col">
              <Input size="lg" required label="name" />
              <Textarea size="lg" label="description" />
              <div className="mt-10">
                <img
                  className="w-32"
                  src="https://uploads-ssl.webflow.com/5eca8aa0518a6eb17eda7575/5eca8f46a391aaba427b2588_logo.svg"
                  alt="smplrspace logo"
                />
                <span>Copy and paste spaceId from smplrspace</span>
              </div>
              <Input size="lg" required label="spaceId" />
            </div>
          </Form>
        </CardBody>
        <CardFooter className="flex justify-end">
          <Link to="/spaces">
            <Button variant="text" color="red" className="mr-1">
              <span>Cancel</span>
            </Button>
          </Link>
          <Button variant="gradient">
            <span>Create</span>
          </Button>
        </CardFooter>
      </Card>
    </Dialog>
  )
}

export default Space
