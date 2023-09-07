import { Avatar, Card, CardBody, CardHeader, Link } from '@nextui-org/react'
import type { LoaderArgs } from '@remix-run/node'
import { Outlet, Link as RemixLink, useLoaderData } from '@remix-run/react'
import clsx from 'clsx'
import { ArrowRight, LampDesk } from 'lucide-react'
import { Button } from '~/components/Button'
import { Container } from '~/components/Container'
import { getCore } from '~/core/get-core'
import { requireUser } from '~/services/session.server'

export const loader = async ({ request }: LoaderArgs) => {
  const user = await requireUser(request)
  const core = getCore()

  return core.user.getOrganizations(user.id)
}

export default function Index() {
  const organizations = useLoaderData<typeof loader>()

  const hasOrganizations = organizations && organizations.length > 0

  return (
    <Container>
      {!hasOrganizations && (
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
                <p className="text-xl md:text-4xl">It's lonely here</p>
                <p className="text-slate-300 md:text-lg max-w-[528px]">
                  Either wait for someone to invite you to an organization or
                  create one yourself!
                </p>
              </div>
              <Link className="text-blue-100" isBlock as={RemixLink} to="new">
                <ArrowRight className="h-[32px] w-[32px] md:h-[52px] md:w-[52px]" />
              </Link>
            </div>
          </CardBody>
        </Card>
      )}

      {hasOrganizations && (
        <div className="flex flex-col gap-2">
          <div className="mb-4 flex flex-col sm:flex-row gap-2 items-center sm:justify-between">
            <h1
              className={clsx(
                'text-3xl',
                'font-extrabold text-transparent',
                'bg-clip-text bg-gradient-to-r',
                'from-blue-700 to-red-400'
              )}
            >
              Your organizations
            </h1>
            <Button
              className="hidden sm:flex"
              as={RemixLink}
              to="new"
              color="primary"
            >
              Create organization
            </Button>
          </div>
          <div className="flex flex-wrap gap-4">
            {organizations.map((organization) => (
              <Card
                key={organization.slug}
                className="w-full sm:w-auto"
                isPressable
                isHoverable
                as={RemixLink}
                to={`/o/${organization.slug}`}
              >
                <CardHeader>
                  <div className="flex gap-4 items-center">
                    <Avatar size="lg" showFallback fallback={<LampDesk />} />
                    <p>{organization.name}</p>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}
      <Outlet />
    </Container>
  )
}
