import { Button, Input, Textarea } from "@nextui-org/react"
import { Form, Outlet, useNavigation } from "@remix-run/react"
import type { ActionFunctionArgs } from "@vercel/remix"
import { z } from "zod"
import { InputAvatar } from "~/components/Inputs/Avatar"
import { getCore } from "~/core/get-core"
import { requireUser } from "~/services/session.server"
import { useOrganizationContext } from "~/utils/hooks/useProfileData"

const FormSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
})

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const user = await requireUser(request)

  const slug = params.slug
  if (!slug) return null

  const formData = await request.formData()
  const data = FormSchema.parse(Object.fromEntries([...formData.entries()]))

  const core = getCore()

  await core.organization.update({ slug, userEmail: user.email, data })

  return null
}

const General = () => {
  const { organization } = useOrganizationContext()
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
            <Button isLoading={state === "submitting"} type="submit" color="primary">
              Save
            </Button>
          </div>
        </div>

        <InputAvatar src={thumbnailUrl} editTo="set-logo" deleteTo="delete-logo" />
      </div>
      <Outlet />
    </Form>
  )
}

export default General
