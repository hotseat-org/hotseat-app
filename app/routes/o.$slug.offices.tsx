import { Card, CardBody, Link } from '@nextui-org/react'
import { Role } from '@prisma/client'
import { Outlet, Link as RemixLink, useLoaderData } from '@remix-run/react'
import { LoaderFunctionArgs, json } from '@remix-run/server-runtime'
import clsx from 'clsx'
import { ArrowRight } from 'lucide-react'
import { Container } from '~/components/Container'
import { SpaceViewer } from '~/components/SpaceView'
import { getCore } from '~/core/get-core'
import { requireProfile } from '~/utils/loader-helpers/requireProfile'
import { useProfile } from '~/utils/remix'

export const loader = async (args: LoaderFunctionArgs) => {
  const core = getCore()
  const profile = await requireProfile(args)

  const offices = await core.organization.getOffices({
    userEmail: profile.userEmail,
    slug: profile.organizationSlug,
  })

  return json({ offices })
}

const Offices = () => {
  const { offices } = useLoaderData<typeof loader>()
  const { role } = useProfile()

  if (offices.totalCount === 0 && role === Role.ADMIN) {
    return (
      <Container>
        <Card
          className={clsx(
            'w-full',
            'bg-gradient-to-r',
            'from-blue-900 via-blue-700 to-red-400 text-blue-300'
          )}
        >
          <CardBody>
            <div className="flex justify-between items-center">
              <div className="flex flex-col gap-2">
                <p className="text-xl md:text-4xl">
                  Your organization has no offices
                </p>
                <p className="text-slate-300 md:text-lg max-w-[528px]">
                  You can create one yourself!
                </p>
              </div>
              <Link
                replace
                className="text-blue-100"
                isBlock
                as={RemixLink}
                to="new"
              >
                <ArrowRight className="h-[32px] w-[32px] md:h-[52px] md:w-[52px]" />
              </Link>
            </div>
          </CardBody>
        </Card>
        <Outlet />
      </Container>
    )
  }

  return (
    <Container>
      {offices.data.map((office) => {
        return (
          <Card key={office.slug} className="w-full sm:w-72">
            <CardBody>
              <p>{office.name}</p>
              <SpaceViewer isPreview spaceId={office.spaceUrl} />
            </CardBody>
          </Card>
        )
      })}
      <Outlet />
    </Container>
  )
}

export default Offices
