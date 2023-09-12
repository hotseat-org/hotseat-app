import {
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from '@nextui-org/react'
import { redirect, type ActionArgs } from '@remix-run/node'
import { Form, Link, useNavigate } from '@remix-run/react'
import { z } from 'zod'
import { Button } from '~/components/Button'
import { getCore } from '~/core/get-core'
import { requireUser } from '~/services/session.server'

export const action = async ({ request, params }: ActionArgs) => {
  const slug = params.slug
  if (!slug) return null

  const user = await requireUser(request)
  const formData = await request.formData()
  const email = z.string().email().parse(formData.get('email'))
  const core = getCore()

  await core.organization.inviteMember({
    userEmail: user.email,
    slug,
    data: { email },
  })

  return redirect('..')
}

const Invite = () => {
  const navigate = useNavigate()

  return (
    <Modal
      backdrop="blur"
      aria-labelledby="modal-title"
      isOpen
      closeButton
      onClose={() => navigate('..')}
      placement="auto"
    >
      <Form method="POST">
        <ModalContent>
          <ModalHeader>Invite members</ModalHeader>
          <ModalBody>
            <Input name="email" placeholder="Email" />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" as={Link} to=".." replace>
              Close
            </Button>
            <Button type="submit" color="primary">
              Invite
            </Button>
          </ModalFooter>
        </ModalContent>
      </Form>
    </Modal>
  )
}

export default Invite
