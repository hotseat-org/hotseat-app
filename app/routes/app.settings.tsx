import { Input } from "@nextui-org/react"
import {
  Form,
  Link,
  Outlet,
  useLoaderData,
  ActionFunctionArgs,
  LoaderFunctionArgs,
  data,
} from "react-router"
import clsx from "clsx"
import { Check, Trash } from "lucide-react"
import { z } from "zod"
import { Button } from "~/components/Button"
import { Container } from "~/components/Container"
import { InputAvatar } from "~/components/Inputs/Avatar"
import { OrganizationPreviewCard } from "~/components/Organization/Card"
import { getCore } from "~/core/get-core"
import { authenticator } from "~/services/auth.server"
import { commitSession, getSession, requireUser } from "~/services/session.server"

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await requireUser(request)

  const core = getCore()
  const [userData, organizations, organizationInvites] = await Promise.all([
    core.user.get(user.email),
    core.user.getOrganizations(user.email),
    core.user.getOrganizationInvites(user.email),
  ])

  if (!userData) throw new Response(null, { status: 404 })

  return { userData, organizations, organizationInvites }
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const user = await requireUser(request)

  const formData = await request.formData()
  const displayName = z.string().parse(formData.get("displayName"))

  const core = getCore()

  const updatedUser = await core.user.update({
    email: user.email,
    data: { displayName },
  })

  const session = await getSession(request.headers.get("cookie"))
  session.set(authenticator.sessionKey, updatedUser)
  const headers = new Headers({ "Set-Cookie": await commitSession(session) })

  return data(null, { headers })
}

export default function Settings() {
  const { userData, organizations, organizationInvites } = useLoaderData<typeof loader>()

  return (
    <Container>
      <div className="flex">
        <h1
          className={clsx(
            "text-3xl",
            "font-extrabold text-transparent",
            "bg-clip-text bg-gradient-to-r",
            "from-blue-700 to-red-400"
          )}
        >
          Your settings
        </h1>
      </div>
      <div className="flex gap-8">
        <InputAvatar src={userData.photo} editTo="set-avatar" deleteTo="delete-avatar" />
        <Form method="POST">
          <div className="flex flex-col gap-2 w-72">
            <Input label="Email" defaultValue={userData.email} isDisabled />
            <Input name="displayName" label="Display name" defaultValue={userData.displayName} />
            <div className="flex justify-end">
              <Button type="submit" color="primary">
                Save
              </Button>
            </div>
          </div>
        </Form>
      </div>

      <div className="flex flex-col gap-4">
        {organizations.length > 0 && <h2>Your organizations</h2>}
        <div className="flex flex-wrap gap-4">
          {organizations.map((organization) => (
            <OrganizationPreviewCard key={organization.slug} organization={organization}>
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

      <div className="flex flex-col gap-4">
        {organizationInvites.length > 0 && <h2>You were invited into these organizations</h2>}
        <div className="flex flex-wrap gap-4">
          {organizationInvites.map((invite) => (
            <OrganizationPreviewCard
              key={invite.organization.slug}
              organization={invite.organization}
            >
              <div className="flex gap-1">
                <Button
                  className="font-bold"
                  color="danger"
                  variant="light"
                  isIconOnly
                  as={Link}
                  to={`decline-invitation/${invite.organization.slug}`}
                >
                  <Trash />
                </Button>

                <Button
                  className="font-bold"
                  color="success"
                  variant="flat"
                  isIconOnly
                  as={Link}
                  to={`/join/${invite.organization.slug}`}
                >
                  <Check />
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
