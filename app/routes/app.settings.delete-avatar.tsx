import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@nextui-org/react"
import { Form, Link, useNavigate } from "react-router"
import { redirect, type ActionFunctionArgs } from "react-router"
import { Button } from "~/components/Button"
import { getCore } from "~/core/get-core"
import { authenticator } from "~/services/auth.server"
import { commitSession, getSession, requireUser } from "~/services/session.server"

export const action = async ({ request }: ActionFunctionArgs) => {
  const user = await requireUser(request)

  const core = getCore()

  const updatedUser = await core.user.update({
    email: user.email,
    data: { avatarUrl: null },
  })

  const session = await getSession(request.headers.get("cookie"))
  session.set(authenticator.sessionKey, updatedUser)
  const headers = new Headers({ "Set-Cookie": await commitSession(session) })

  return redirect("..", { headers })
}

export default function DeleteAvatar() {
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
            <p>Are you sure you want to delete this avatar?</p>
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
