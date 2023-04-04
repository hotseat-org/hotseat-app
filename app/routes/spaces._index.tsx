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
import { Link } from '@remix-run/react'
import { SpaceViewer } from '~/components/SpaceView'
import { requireUser } from '~/services/session.server'

export const loader = async ({ request }: LoaderArgs) => {
  await requireUser(request)

  return null
}

const Index = () => {
  return (
    <>
      <div className="mx-auto max-w-screen-2xl pt-36 flex gap-5 flex-wrap basis-full">
        <Card className="bg-white rounded-2xl bg-opacity-80 w-96 h-[482px]">
          <Link to="/spaces/foo">
            <CardHeader color="gray" className="rounded-lg">
              <SpaceViewer isPreview />
            </CardHeader>

            <CardBody>
              <Typography variant="h4" color="blue-gray">
                Office Karlín
              </Typography>
              <Typography
                variant="lead"
                color="gray"
                className="mt-3 font-normal"
              >
                Because it&apos;s about motivating the doers. Because I&apos;m
                here to follow my dreams and inspire others.
              </Typography>
            </CardBody>
          </Link>
          <CardFooter className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button size="sm" className="flex gap-2 items-center">
                <WrenchScrewdriverIcon
                  strokeWidth={2}
                  className="h-[18px] w-[18px]"
                />
                Edit
              </Button>
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

        <Card className="bg-white rounded-2xl bg-opacity-80 w-96 h-[482px]">
          <Link to="/spaces/foo">
            <CardHeader color="gray" className="rounded-lg">
              <SpaceViewer
                isPreview
                spaceId="5c14e4e9-f25a-4834-bfb2-e1e0eba54396"
                clientToken="pub_1d417e73b210413e95fcea6c281f8e0b"
              />
            </CardHeader>
            <CardBody>
              <Typography variant="h4" color="blue-gray">
                Office Strakonice
              </Typography>
              <Typography
                variant="lead"
                color="gray"
                className="mt-3 font-normal"
              >
                Because it&apos;s about motivating the doers. Because I&apos;m
                here to follow my dreams and inspire others.
              </Typography>
            </CardBody>
          </Link>
          <CardFooter className="flex items-center justify-between">
            <Button size="sm" className="flex gap-2 items-center">
              <WrenchScrewdriverIcon
                strokeWidth={2}
                className="h-[18px] w-[18px]"
              />
              Edit
            </Button>
            <Typography className="font-normal">January 10</Typography>
          </CardFooter>
        </Card>
        <Card className="bg-blue-gray-200 opacity-80 hover:opacity-100 rounded-2xl bg-opacity-80 w-96 h-[482px] flex items-center justify-center">
          <div className="flex items-center gap-5 flex-col">
            <PlusIcon strokeWidth={2} className="h-[64px] w-[64px]" />
            <Typography variant="h4" color="blue-grey">
              Add new space
            </Typography>
          </div>
        </Card>
      </div>
    </>
  )
}

export default Index
