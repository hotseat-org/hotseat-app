import {
  Avatar,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Tooltip,
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
      <div className="mx-auto max-w-screen-2xl h-screen pt-36 ">
        <Link to="/spaces/foo">
          <Card className="bg-white rounded-2xl bg-opacity-80 w-96">
            <CardHeader color="transparent" className="rounded-lg">
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
            <CardFooter className="flex items-center justify-between">
              <div className="flex items-center -space-x-3">
                <Tooltip content="Natali Craig">
                  <Avatar
                    size="sm"
                    variant="circular"
                    alt="natali craig"
                    src="https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1061&q=80"
                    className="border-2 border-white hover:z-10"
                  />
                </Tooltip>
                <Tooltip content="Candice Wu">
                  <Avatar
                    size="sm"
                    variant="circular"
                    alt="candice wu"
                    src="https://images.unsplash.com/photo-1633332755192-727a05c4013d?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1480&q=80"
                    className="border-2 border-white hover:z-10"
                  />
                </Tooltip>
              </div>
              <Typography className="font-normal">January 10</Typography>
            </CardFooter>
          </Card>
        </Link>
      </div>
    </>
  )
}

export default Index
