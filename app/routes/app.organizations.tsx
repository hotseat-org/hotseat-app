import { Card, CardBody, Link } from '@nextui-org/react'
import { Outlet, Link as RemixLink, useLoaderData } from '@remix-run/react'
import type { LoaderFunctionArgs } from '@vercel/remix'
import clsx from 'clsx'
import { ArrowRight } from 'lucide-react'
import { Button } from '~/components/Button'
import { Container } from '~/components/Container'
import { OrganizationPreviewCard } from '~/components/Organization/Card'
import { getCore } from '~/core/get-core'
import { requireUser } from '~/services/session.server'

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await requireUser(request)
  const core = getCore()

  return core.user.getOrganizations(user.email)
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
          </div>
          <div className="flex flex-wrap gap-4">
            {organizations.map((organization) => (
              <OrganizationPreviewCard
                key={organization.slug}
                organization={organization}
              >
                <Button
                  className="font-bold"
                  color="primary"
                  variant="flat"
                  as={RemixLink}
                  to={`/o/${organization.slug}`}
                >
                  View
                </Button>
              </OrganizationPreviewCard>
            ))}
          </div>
        </div>
      )}
      <Outlet />
    </Container>
  )
}
