import { Modal } from '@nextui-org/react'
import { useNavigate } from '@remix-run/react'

import { redirect, type ActionFunctionArgs } from '@vercel/remix'
import { z } from 'zod'

import ImageUpload from '~/components/Forms/ImageUpload'
import { getCore } from '~/core/get-core'
import { authenticator } from '~/services/auth.server'
import {
  commitSession,
  getSession,
  requireUser,
} from '~/services/session.server'

export const action = async ({ request }: ActionFunctionArgs) => {
  const user = await requireUser(request)

  const formData = await request.formData()
  const thumbnail = z.string().parse(formData.get('thumbnail'))

  const core = getCore()

  const updatedUser = await core.user.update({
    email: user.email,
    data: { avatarUrl: thumbnail },
  })

  const session = await getSession(request.headers.get('cookie'))
  session.set(authenticator.sessionKey, updatedUser)
  let headers = new Headers({ 'Set-Cookie': await commitSession(session) })

  return redirect('..', { headers })
}

export default function Index() {
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
      <ImageUpload />
    </Modal>
  )
}
