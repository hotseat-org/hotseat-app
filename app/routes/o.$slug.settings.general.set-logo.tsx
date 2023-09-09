import {
  Avatar,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
} from '@nextui-org/react'
import { Form, Link, useNavigate } from '@remix-run/react'

import { redirect, type ActionArgs } from '@vercel/remix'
import clsx from 'clsx'
import { UploadCloud } from 'lucide-react'
import { useState } from 'react'
import { z } from 'zod'

import { Button } from '~/components/Button'
import { getCore } from '~/core/get-core'
import { requireUser } from '~/services/session.server'

export const action = async ({ request, params }: ActionArgs) => {
  const user = await requireUser(request)

  const slug = params.slug

  if (!slug) throw new Error('Missing slug parameter')

  const formData = await request.formData()
  const thumbnail = z.string().parse(formData.get('thumbnail'))

  const core = getCore()

  await core.organization.update({ slug, userId: user.id, data: { thumbnail } })

  return redirect('..')
}

export default function Index() {
  const navigate = useNavigate()

  const [file, setFile] = useState<File | undefined>()
  const [thumbnail, setThumbnail] = useState<string | undefined>()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setThumbnail(undefined)

    const newFile = e.target.files?.[0]
    if (newFile) {
      setFile(newFile)

      const data = await fetch(`/api/upload-url`, {
        method: 'POST',
      }).then((res) => res.json())

      const body = new FormData()
      body.append('file', newFile)

      const uploadResult = await fetch(data.uploadUrl, {
        method: 'POST',
        body,
      }).then((res) => res.json())

      setThumbnail(uploadResult.result.id)
    }
  }

  const isOptimistic = !!file && !thumbnail

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
          <ModalHeader />
          <ModalBody>
            <div className="flex items-center justify-center w-full">
              <label
                className={clsx(
                  'flex flex-col items-center justify-center w-full h-64 cursor-pointer',
                  'border-2 border-dashed rounded-lg',
                  'border-gray-700 bg-slate-100 hover:bg-slate-200',
                  'dark:bg-black/30 dark:hover:bg-black/50 dark:border-slate-400 dark:hover:border-slate-500 '
                )}
              >
                {file ? (
                  <div className="flex">
                    <div className="relative">
                      <div className={clsx({ 'opacity-10': isOptimistic })}>
                        <Avatar
                          className="w-52 h-52 z-0"
                          src={URL.createObjectURL(file)}
                        />
                      </div>
                      {isOptimistic && (
                        <Spinner
                          size="lg"
                          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-1"
                        />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <UploadCloud />
                    <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-semibold">Click to upload</span> or
                      drag and drop
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      SVG, PNG, JPG, WEBP, or GIF
                    </p>
                  </div>
                )}

                <input
                  accept=".svg,.png,.gif,.jpg,.jpeg,.webp"
                  onChange={handleFileChange}
                  id="dropzone-file"
                  type="file"
                  className="hidden"
                />
              </label>
            </div>

            <input hidden name="thumbnail" value={thumbnail} />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" as={Link} to=".." replace>
              Close
            </Button>
            <Button isDisabled={!thumbnail} type="submit" color="primary">
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Form>
    </Modal>
  )
}
