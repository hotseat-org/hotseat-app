import { Card, CardBody, CardFooter, Link, Tooltip } from '@nextui-org/react'
import { Role } from '@prisma/client'
import {
  Form,
  Outlet,
  Link as RemixLink,
  useLoaderData,
} from '@remix-run/react'
import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  json,
} from '@remix-run/server-runtime'
import clsx from 'clsx'
import { ArrowRight, Star } from 'lucide-react'
import { z } from 'zod'
import { Button } from '~/components/Button'
import { Container } from '~/components/Container'
import { SpaceViewer } from '~/components/SpaceView'
import { getCore } from '~/core/get-core'
import { requireProfile } from '~/utils/loader-helpers/requireProfile'
import { useProfile } from '~/utils/remix'

enum FormIntent {
  SET_FAVORITE = 'set-favorite',
  UNSET_FAVORITE = 'unset-favorite',
}

export const loader = async (args: LoaderFunctionArgs) => {
  const core = getCore()
  const profile = await requireProfile(args)

  const offices = await core.organization.getOffices({
    userEmail: profile.userEmail,
    slug: profile.organizationSlug,
  })

  return json({ offices })
}

export const action = async (args: ActionFunctionArgs) => {
  const profile = await requireProfile(args)
  const core = getCore()
  const { request } = args

  const formData = await request.formData()
  const intent = z.nativeEnum(FormIntent).parse(formData.get('intent'))
  const officeSlug = z.string().parse(formData.get('officeSlug'))

  if (intent === FormIntent.SET_FAVORITE && officeSlug) {
    await core.office.setFavorite({
      slug: officeSlug,
      organizationSlug: profile.organizationSlug,
      email: profile.userEmail,
    })
  }

  if (intent === FormIntent.UNSET_FAVORITE) {
    await core.office.unsetFavorite({
      email: profile.userEmail,
      organizationSlug: profile.organizationSlug,
    })
  }

  return null
}

const Offices = () => {
  const { offices } = useLoaderData<typeof loader>()
  const { role, favoriteOffice } = useProfile()

  console.log(favoriteOffice)

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
        const isFavoriteOffice = office.slug === favoriteOffice?.slug
        return (
          <Card key={office.slug} className="w-full sm:w-72 border-none">
            <SpaceViewer isPreview spaceId={office.spaceUrl} />
            <CardFooter className=" bg-foreground-100 before:bg-white/10 border-white/20 border-1 overflow-hidden py-1 absolute before:rounded-xl rounded-large bottom-1 w-[calc(100%_-_8px)] shadow-small ml-1 z-10">
              <div className="flex justify-between w-full items-center">
                <span>{office.name}</span>
                <div className="flex gap-2 items-center">
                  <Form method="POST">
                    <input hidden name="officeSlug" value={office.slug} />
                    <Button
                      size="sm"
                      color={isFavoriteOffice ? 'warning' : 'default'}
                      variant="light"
                      isIconOnly
                      type="submit"
                      name="intent"
                      value={
                        isFavoriteOffice
                          ? FormIntent.UNSET_FAVORITE
                          : FormIntent.SET_FAVORITE
                      }
                    >
                      <Tooltip
                        content={
                          isFavoriteOffice
                            ? 'Remove favorite'
                            : 'Set as favorite'
                        }
                      >
                        <Star strokeWidth={isFavoriteOffice ? 3 : undefined} />
                      </Tooltip>
                    </Button>
                  </Form>

                  <Link
                    as={RemixLink}
                    to={`/o/${office.organizationSlug}/office/${office.slug}`}
                    isBlock
                    color="primary"
                  >
                    View
                  </Link>
                </div>
              </div>
            </CardFooter>
          </Card>
        )
      })}
      <Outlet />
    </Container>
  )
}

export default Offices
