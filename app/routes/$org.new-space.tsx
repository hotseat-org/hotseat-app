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
import type { ActionFunction } from '@vercel/remix'
import { redirect } from '@vercel/remix'
import { Form, Link } from '@remix-run/react'
import { getCore } from '~/core/get-core'
import * as z from 'zod'

const CreateSpaceSchema = z.object({
  name: z.string(),
  spaceId: z.string(),
  description: z.string().optional(),
})

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData()
  const data = await CreateSpaceSchema.parseAsync(
    Object.fromEntries(formData.entries())
  )

  const core = getCore()
  await core.space.create(data)

  return redirect('/spaces')
}

export const Space = () => {
  return (
    <Dialog size="xs" open handler={() => {}}>
      <Form method="post">
        <Card>
          <CardHeader className="h-56">
            <img
              src="https://images.pexels.com/photos/4125267/pexels-photo-4125267.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
              alt="img-blur-shadow"
              className="h-full w-full"
            />
          </CardHeader>
          <CardBody>
            <div className="flex gap-5 flex-col">
              <Input size="lg" required label="name" name="name" />
              <Textarea size="lg" label="description" name="description" />
              <div className="mt-10">
                <img
                  className="w-32"
                  src="https://uploads-ssl.webflow.com/5eca8aa0518a6eb17eda7575/5eca8f46a391aaba427b2588_logo.svg"
                  alt="smplrspace logo"
                />
                <span>Copy and paste spaceId from smplrspace</span>
              </div>
              <Input size="lg" required label="spaceId" name="spaceId" />
            </div>
          </CardBody>
          <CardFooter className="flex justify-end">
            <Link to="..">
              <Button variant="text" color="red" className="mr-1">
                <span>Cancel</span>
              </Button>
            </Link>
            <Button type="submit" variant="gradient">
              <span>Create</span>
            </Button>
          </CardFooter>
        </Card>
      </Form>
    </Dialog>
  )
}

export default Space
