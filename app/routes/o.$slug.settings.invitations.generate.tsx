import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from '@nextui-org/react'
import { Form, Link, useNavigate } from '@remix-run/react'
import { redirect, type ActionFunctionArgs } from '@vercel/remix'
import { Button } from '~/components/Button'
import { getCore } from '~/core/get-core'
import { requireUser } from '~/services/session.server'

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const slug = params.slug
  if (!slug) return null

  const user = await requireUser(request)
  const core = getCore()

  await core.organization.generateNewInviteLink({
    userEmail: user.email,
    organizationSlug: slug,
  })

  return redirect('..')
}

const GenerateInviteLink = () => {
  const navigate = useNavigate()

  return (
    <Modal
      backdrop="blur"
      aria-labelledby="Generate new invite link"
      isOpen
      closeButton
      onClose={() => navigate('..')}
      placement="auto"
    >
      <Form method="POST">
        <ModalContent>
          <ModalHeader>Generate new invite link</ModalHeader>
          <ModalBody>
            <div>
              <p>Are you sure you want to generate new invite link?</p>
              <p>Current link will no longer work.</p>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" as={Link} to=".." replace>
              Close
            </Button>
            <Button type="submit" color="primary">
              Generate
            </Button>
          </ModalFooter>
        </ModalContent>
      </Form>
    </Modal>
  )
}

export default GenerateInviteLink
