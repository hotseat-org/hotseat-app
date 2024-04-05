import {
  Code,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
} from '@nextui-org/react'
import { Link, useFetcher, useNavigate } from '@remix-run/react'
import { ActionFunctionArgs, redirect } from '@remix-run/server-runtime'
import { useDebounce } from '@uidotdev/usehooks'
import { Check, HelpCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { Button } from '~/components/Button'
import { ImageUploadInput } from '~/components/Inputs/ImageUpload'
import { getCore } from '~/core/get-core'
import { requireProfile } from '~/utils/loader-helpers/requireProfile'

type Availability = 'available' | 'not-available' | 'unknown' | 'checking'

enum Intent {
  CREATE_OFFICE = 'createOffice',
  CHECK_AVAILABILITY = 'checkAvailability',
}

const availabilityToLabelMap: Record<Availability, string> = {
  available: 'Available',
  'not-available': 'Not available',
  checking: 'Checking availability',
  unknown: 'Start typing to check availability',
}

export const action = async ({
  request,
  params,
  context,
}: ActionFunctionArgs) => {
  const profile = await requireProfile({ request, params, context })

  const formData = await request.formData()
  const name = z.string().parse(formData.get('name'))
  const intent = z.nativeEnum(Intent).parse(formData.get('intent'))
  const core = getCore()

  if (intent === Intent.CHECK_AVAILABILITY) {
    const isAvailable = await core.office.isAvailable(
      name,
      profile.organizationSlug
    )

    return isAvailable
  }

  if (intent === Intent.CREATE_OFFICE) {
    const spaceId = z.string().parse(formData.get('spaceId'))
    const thumbnail = z.string().parse(formData.get('thumbnail'))

    const office = await core.office.create({
      name,
      organizationSlug: profile.organizationSlug,
      spaceId,
      thumbnail,
      userEmail: profile.userEmail,
    })

    return redirect(`/o/${office.organizationSlug}`)
  }

  return null
}

const NewOffice = () => {
  const navigate = useNavigate()
  const [name, setName] = useState<string | undefined>()
  const debouncedName = useDebounce(name, 400)
  const { Form, submit, state, data: isAvailable } = useFetcher<typeof action>()

  const getAvailabilityState = (): Availability => {
    if (state === 'submitting') return 'checking'
    if (!debouncedName) return 'unknown'
    if (isAvailable) return 'available'
    return 'not-available'
  }

  const availability = useDebounce(getAvailabilityState(), 200)

  useEffect(() => {
    if (debouncedName) {
      submit(
        { name: debouncedName, intent: Intent.CHECK_AVAILABILITY },
        { method: 'POST' }
      )
    }
  }, [debouncedName, submit])

  return (
    <Modal
      aria-labelledby="modal-title"
      isOpen
      closeButton
      onClose={() => navigate('..')}
      placement="auto"
      backdrop="blur"
    >
      <ModalContent>
        <Form method="POST">
          <ModalHeader>
            <p>Create a new office</p>
          </ModalHeader>
          <ModalBody>
            <ImageUploadInput name="thumbnail" />
            <Input
              isClearable
              onClear={() => setName(undefined)}
              fullWidth
              isRequired
              name="name"
              label="Name"
              onChange={(e) => {
                setName(e.target.value)
              }}
            />
            <Code
              color={
                (
                  {
                    available: 'success',
                    'not-available': 'danger',
                    unknown: 'warning',
                    checking: 'warning',
                  } as const
                )[availability]
              }
            >
              <div className="flex flex-col gap-2 h-8 justify-center">
                <div className="flex gap-2 items-center">
                  {availability === 'available' && <Check size="20" />}
                  {availability === 'checking' && (
                    <Spinner size="sm" color="warning" />
                  )}
                  {availability === 'unknown' && <HelpCircle size="20" />}
                  <span>{availabilityToLabelMap[availability]}</span>
                </div>
              </div>
            </Code>
            <Input
              isClearable
              fullWidth
              isRequired
              name="spaceId"
              label="Space ID"
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" as={Link} to=".." replace>
              Close
            </Button>
            <Button
              type="submit"
              name="intent"
              value={Intent.CREATE_OFFICE}
              isDisabled={availability !== 'available'}
              color="primary"
            >
              Create
            </Button>
          </ModalFooter>
        </Form>
      </ModalContent>
    </Modal>
  )
}

export default NewOffice
