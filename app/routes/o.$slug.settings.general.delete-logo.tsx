import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@nextui-org/react"
import { Form, Link, useNavigate } from "@remix-run/react"
import { redirect, type ActionFunctionArgs } from "@vercel/remix"
import { Button } from "~/components/Button"
import { getCore } from "~/core/get-core"
import { requireUser } from "~/services/session.server"

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const user = await requireUser(request)

  const slug = params.slug
  if (!slug) throw new Error("Missing slug parameter")

  const core = getCore()

  await core.organization.update({
    slug,
    userEmail: user.email,
    data: { thumbnail: null },
  })

  return redirect("..")
}

export default function Index() {
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
      <Form method="POST">
        <ModalContent>
          <ModalHeader />
          <ModalBody>
            <p>Are you sure you want to delete this logo?</p>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" as={Link} to=".." replace>
              Close
            </Button>
            <Button type="submit" color="danger">
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Form>
    </Modal>
  )
}
