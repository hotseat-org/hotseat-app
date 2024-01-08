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
  const user = await requireUser(request)

  const slug = params.slug

  if (!slug) throw new Error('Missing slug parameter')

  const core = getCore()

  await core.organization.leave({ organizationSlug: slug, email: user.email })

  return redirect('/app/settings')
}

export default function LeaveOrganization() {
  const navigate = useNavigate()

  return (
    <Modal
      aria-labelledby="modal-title"
      isOpen
      closeButton
      onClose={() => navigate('/app/settings')}
      placement="auto"
    >
      <Form method="POST">
        <ModalContent>
          <ModalHeader />
          <ModalBody>
            <p>Are you sure you want to leave this organization?</p>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" as={Link} to=".." replace>
              Close
            </Button>
            <Button type="submit" color="danger">
              Leave
            </Button>
          </ModalFooter>
        </ModalContent>
      </Form>
    </Modal>
  )
}
