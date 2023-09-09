import {
  Avatar,
  Button,
  Card,
  CardFooter,
  Input,
  Textarea,
} from '@nextui-org/react'
import type { ActionArgs } from '@remix-run/node'
import {
  Form,
  Link,
  Outlet,
  useNavigation,
  useRouteLoaderData,
} from '@remix-run/react'
import { Edit, Trash, Users } from 'lucide-react'
import { z } from 'zod'
import { getCore } from '~/core/get-core'
import { requireUser } from '~/services/session.server'
import type { loader as organizationLoader } from './o.$slug'

const FormSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
})

export const action = async ({ request, params }: ActionArgs) => {
  const user = await requireUser(request)

  const slug = params.slug
  if (!slug) return null

  const formData = await request.formData()
  const data = FormSchema.parse(Object.fromEntries([...formData.entries()]))

  const core = getCore()

  await core.organization.update({ slug, userId: user.id, data })

  return null
}

const SettingsInfo = () => {
  const organization =
    useRouteLoaderData<typeof organizationLoader>('routes/o.$slug')
  const { state } = useNavigation()

  const thumbnailUrl = organization?.thumbnailUrl

  return (
    <Form method="POST">
      <div className="flex flex-col-reverse md:flex-row gap-12 md:w-[825px]">
        <div className="md:w-[462px] flex flex-col gap-8">
          <Input
            label="Name"
            isRequired
            name="name"
            labelPlacement="outside"
            description="Your organization is visible only to its members"
            defaultValue={organization?.name}
          />
          <Textarea
            name="description"
            label="Description"
            labelPlacement="outside"
            defaultValue={organization?.description}
          />
          <div className="flex justify-end">
            <Button
              isLoading={state === 'submitting'}
              type="submit"
              color="primary"
            >
              Save
            </Button>
          </div>
        </div>

        <div className="flex md:flex-col">
          <div className="relative">
            <Avatar
              fallback={<Users size={72} />}
              className="w-52 h-52 z-0"
              src={thumbnailUrl}
              isBordered
            />
            <Card
              isBlurred
              className="absolute top-[80%] left-[80%] -translate-x-1/2 -translate-y-1/2 z-1"
            >
              <CardFooter className="gap-2 p-1">
                <Button
                  as={Link}
                  to="delete-logo"
                  variant="light"
                  isIconOnly
                  color="danger"
                  size="sm"
                >
                  <Trash size="18" />
                </Button>
                <Button as={Link} to="set-logo" variant="flat" size="sm">
                  <Edit size="18" /> Edit
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
      <Outlet />
    </Form>
  )
}

export default SettingsInfo
