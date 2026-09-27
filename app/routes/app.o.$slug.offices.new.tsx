import { Input, Label, Modal, Spinner, TextField } from "@heroui/react"
import {
  useFetcher,
  useNavigate,
  useSearchParams,
  ActionFunctionArgs,
  redirect,
  useParams,
} from "react-router"
import { useDebounce } from "@uidotdev/usehooks"
import { Check, HelpCircle } from "lucide-react"
import { useEffect, useState } from "react"
import { z } from "zod"
import { Button } from "~/components/Button"
import { ImageUploadInput } from "~/components/Inputs/ImageUpload"
import { getCore } from "~/core/get-core"
import { requireProfile } from "~/utils/loader-helpers/requireProfile"

type Availability = "available" | "not-available" | "unknown" | "checking"

enum Intent {
  CREATE_OFFICE = "createOffice",
  CHECK_AVAILABILITY = "checkAvailability",
}

const availabilityToLabelMap: Record<Availability, string> = {
  available: "Available",
  "not-available": "Not available",
  checking: "Checking availability",
  unknown: "Start typing to check availability",
}

export const action = async (args: ActionFunctionArgs) => {
  const profile = await requireProfile(args)

  const formData = await args.request.formData()
  const name = z.string().parse(formData.get("name"))
  const intent = z.enum(Intent).parse(formData.get("intent"))
  const core = getCore()

  if (intent === Intent.CHECK_AVAILABILITY) {
    const isAvailable = await core.office.isAvailable(name, profile.organizationSlug)

    return isAvailable
  }

  if (intent === Intent.CREATE_OFFICE) {
    const thumbnail = z.string().parse(formData.get("thumbnail"))

    const office = await core.office.create({
      name,
      organizationSlug: profile.organizationSlug,
      thumbnail,
      userEmail: profile.userEmail,
    })

    return redirect(`/app/o/${office.organizationSlug}/offices/${office.slug}`)
  }

  return null
}

export const NewOffice = () => {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  // Opened as `?modal=new-office` over a page → just remove the param (stay on
  // that office); on the standalone /offices/new page → go back up.
  const close = () => {
    if (searchParams.has("modal")) {
      const next = new URLSearchParams(searchParams)
      next.delete("modal")
      setSearchParams(next, { replace: true })
    } else navigate("..", { replace: true })
  }
  const [name, setName] = useState<string | undefined>()
  const debouncedName = useDebounce(name, 400)
  const { Form, submit, state, data: isAvailable } = useFetcher<typeof action>()

  const getAvailabilityState = (): Availability => {
    if (state === "submitting") return "checking"
    if (!debouncedName) return "unknown"
    if (isAvailable) return "available"
    return "not-available"
  }

  const availability = useDebounce(getAvailabilityState(), 200)

  useEffect(() => {
    if (debouncedName) {
      submit(
        { name: debouncedName, intent: Intent.CHECK_AVAILABILITY },
        { method: "POST", action: `/app/o/${slug}/offices/new` }
      )
    }
  }, [debouncedName, submit])

  return (
    <Modal
      isOpen
      onOpenChange={(isOpen) => {
        if (!isOpen) close()
      }}
    >
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog>
            <Form method="POST" action={`/app/o/${slug}/offices/new`}>
              <Modal.Header>
                <p>Create a new office</p>
              </Modal.Header>
              <Modal.Body>
                <div className="flex flex-col gap-4">
                  <ImageUploadInput name="thumbnail" />
                  <TextField isRequired name="name" onChange={(value) => setName(value)} autoFocus>
                    <Label>Name</Label>
                    <Input />
                  </TextField>
                  <div className="flex gap-2 items-center h-8">
                    {availability === "available" && <Check size="20" />}
                    {availability === "checking" && <Spinner size="sm" color="warning" />}
                    {availability === "unknown" && <HelpCircle size="20" />}
                    <span className="text-sm">{availabilityToLabelMap[availability]}</span>
                  </div>
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" type="button" onPress={close}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  name="intent"
                  value={Intent.CREATE_OFFICE}
                  isDisabled={availability !== "available"}
                  variant="primary"
                >
                  Create
                </Button>
              </Modal.Footer>
            </Form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}

export default NewOffice
