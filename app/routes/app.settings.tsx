import { Input } from '@nextui-org/react'
import { Link, Outlet, useLoaderData } from '@remix-run/react'
import { LoaderFunctionArgs, json } from '@remix-run/server-runtime'
import clsx from 'clsx'
import { Button } from '~/components/Button'
import { Container } from '~/components/Container'
import { InputAvatar } from '~/components/Inputs/Avatar'
import { OrganizationPreviewCard } from '~/components/Organization/Card'
import { getCore } from '~/core/get-core'
import { requireUser } from '~/services/session.server'

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await requireUser(request)

  const core = getCore()
  const [userData, organizations] = await Promise.all([
    core.user.get(user.email),
    core.user.getOrganizations(user.email),
  ])

  if (!userData) throw new Response(null, { status: 404 })

  return json({ userData, organizations })
}

export default function Settings() {
  const { userData, organizations } = useLoaderData<typeof loader>()

  return (
    <Container>
      <div className="flex">
        <h1
          className={clsx(
            'text-3xl',
            'font-extrabold text-transparent',
            'bg-clip-text bg-gradient-to-r',
            'from-blue-700 to-red-400'
          )}
        >
          Your settings
        </h1>
      </div>
      <div className="flex gap-8">
        <InputAvatar
          src={userData.photo}
          editTo="set-avatar"
          deleteTo="delete-avatar"
        />
        <div className="flex flex-col gap-2 w-72">
          <Input label="Email" defaultValue={userData.email} isDisabled />
          <Input label="Display name" defaultValue={userData.displayName} />
          <div className="flex justify-end">
            <Button color="primary">Save</Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h2>Your organizations</h2>
        <div className="flex flex-wrap gap-4">
          {organizations.map((organization) => (
            <OrganizationPreviewCard
              key={organization.slug}
              organization={organization}
            >
              <div className="flex gap-1">
                <Button
                  className="font-bold"
                  color="danger"
                  variant="light"
                  as={Link}
                  to={`leave-organization/${organization.slug}`}
                >
                  Leave
                </Button>
                <Button
                  className="font-bold"
                  color="primary"
                  variant="flat"
                  as={Link}
                  to={`/o/${organization.slug}`}
                >
                  View
                </Button>
              </div>
            </OrganizationPreviewCard>
          ))}
        </div>
      </div>

      <Outlet />
    </Container>
  )
}
