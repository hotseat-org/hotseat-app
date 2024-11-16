import { Modal } from "@nextui-org/react"
import { useNavigate } from "@remix-run/react"
import { redirect, type ActionFunctionArgs } from "@vercel/remix"
import { z } from "zod"
import ImageUpload from "~/components/Forms/ImageUpload"
import { getCore } from "~/core/get-core"
import { requireUser } from "~/services/session.server"

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const user = await requireUser(request)

  const slug = params.slug
  if (!slug) throw new Error("Missing slug parameter")

  const formData = await request.formData()
  const thumbnail = z.string().parse(formData.get("thumbnail"))

  const core = getCore()

  await core.organization.update({
    slug,
    userEmail: user.email,
    data: { thumbnail },
  })

  return redirect("..")
}

export default function SetLogo() {
  const navigate = useNavigate()

  return (
    <Modal
      backdrop="blur"
      aria-labelledby="modal-title"
      isOpen
      closeButton
      onClose={() => navigate("..")}
      placement="auto"
    >
      <ImageUpload />
    </Modal>
  )
}
