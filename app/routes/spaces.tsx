import {
  PlusIcon,
  TrashIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/solid'
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Typography,
} from '@material-tailwind/react'
import type { LoaderArgs } from '@remix-run/node'
import { Link, Outlet, useLoaderData } from '@remix-run/react'
import { SpaceViewer } from '~/components/SpaceView'
import { getCore } from '~/core/get-core'
import { requireUser } from '~/services/session.server'

export const loader = async ({ request }: LoaderArgs) => {
  await requireUser(request)

  const core = getCore()

  return core.space.getMany()
}

const Index = () => {
  const spaces = useLoaderData<typeof loader>()
  return (
    <>
      <div className="mx-auto max-w-screen-2xl pt-36 flex gap-5 flex-wrap basis-full">
        {spaces.map((space) => {
          return (
            <Card
              key={space.id}
              className="bg-white rounded-2xl bg-opacity-80 w-96 h-[382px]"
            >
              <Link to={`/space/${space.id}/view`}>
                <CardHeader color="gray" className="rounded-lg">
                  <SpaceViewer isPreview spaceId={space.spaceId} />
                </CardHeader>

                <CardBody>
                  <Typography variant="h4" color="blue-gray">
                    {space.name}
                  </Typography>
                  <Typography
                    variant="lead"
                    color="gray"
                    className="mt-3 font-normal"
                  >
                    {space.description}
                  </Typography>
                </CardBody>
              </Link>
              <CardFooter className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Link to={`/space/${space.id}/edit`}>
                    <Button size="sm" className="flex gap-2 items-center">
                      <WrenchScrewdriverIcon
                        strokeWidth={2}
                        className="h-[18px] w-[18px]"
                      />
                      Edit
                    </Button>
                  </Link>
                  <Button
                    variant="filled"
                    color="red"
                    size="sm"
                    className="flex gap-2 items-center"
                  >
                    <TrashIcon strokeWidth={2} className="h-[18px] w-[18px]" />
                  </Button>
                </div>

                <Typography className="font-normal">January 10</Typography>
              </CardFooter>
            </Card>
          )
        })}

        <Link to="/spaces/new">
          <Card className="bg-blue-gray-200 opacity-80 hover:opacity-100 rounded-2xl bg-opacity-80 w-96 h-[382px] flex items-center justify-center">
            <div className="flex items-center gap-5 flex-col">
              <PlusIcon strokeWidth={2} className="h-[64px] w-[64px]" />
              <Typography variant="h4" color="blue-grey">
                Add new space
              </Typography>
            </div>
          </Card>
        </Link>
      </div>
      <Outlet />
    </>
  )
}

export default Index
