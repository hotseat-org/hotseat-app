import { Input, Label, Modal, TextField } from "@heroui/react"
import { useFetcher, useSearchParams } from "react-router"
import { useDebounce } from "@uidotdev/usehooks"
import { redirect, type ActionFunctionArgs } from "react-router"
import { Building2, Check, X } from "lucide-react"
import { useEffect, useState } from "react"
import slugify from "slugify"
import { z } from "zod"
import { Button } from "~/components/Button"
import { getCore } from "~/core/get-core"
import { requireUser } from "~/services/session.server"

type Availability = "available" | "not-available" | "checking" | "unknown"
enum Intent {
  CREATE_ORGANIZATION = "createOrganization",
  CHECK_AVAILABILITY = "checkAvailability",
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const user = await requireUser(request)

  const formData = await request.formData()
  const name = z.string().parse(formData.get("name"))
  const intent = z.enum(Intent).parse(formData.get("intent"))
  const core = getCore()

  if (intent === Intent.CHECK_AVAILABILITY) {
    const isAvailable = await core.organization.isAvailable(name)

    return isAvailable
  }

  if (intent === Intent.CREATE_ORGANIZATION) {
    const organization = await core.organization.create({
      name,
      userEmail: user.email,
    })

    return redirect(`/app/o/${organization.slug}`)
  }

  return null
}

const CheckingDots = () => (
  <div className="flex items-center gap-1">
    <div className="h-1.5 w-1.5 rounded-full bg-accent animate-dot-pulse" />
    <div className="h-1.5 w-1.5 rounded-full bg-accent animate-dot-pulse [animation-delay:150ms]" />
    <div className="h-1.5 w-1.5 rounded-full bg-accent animate-dot-pulse [animation-delay:300ms]" />
  </div>
)

const AvailabilityIndicator = ({ availability }: { availability: Availability }) => {
  return (
    <div className="flex items-center gap-1.5 mt-1.5 h-5 overflow-hidden">
      {availability === "checking" && (
        <div className="flex items-center gap-2 animate-slide-in">
          <CheckingDots />
          <span className="text-xs text-foreground/40">Checking availability...</span>
        </div>
      )}
      {availability === "available" && (
        <div className="flex items-center gap-1.5 animate-slide-in">
          <div className="animate-icon-pop">
            <Check size={14} className="text-success" />
          </div>
          <span className="text-xs text-success">Available</span>
        </div>
      )}
      {availability === "not-available" && (
        <div className="flex items-center gap-1.5 animate-slide-in">
          <div className="animate-icon-pop">
            <X size={14} className="text-danger" />
          </div>
          <span className="text-xs text-danger">Not available</span>
        </div>
      )}
    </div>
  )
}

export const NewOrganization = () => {
  const [_, setSearchParams] = useSearchParams()
  const [name, setName] = useState<string | undefined>()
  const debouncedName = useDebounce(name, 600)
  const { Form, submit, state, data: isAvailable } = useFetcher<typeof action>()

  const getAvailabilityState = (): Availability => {
    if (!debouncedName) return "unknown"
    if (state === "submitting" || state === "loading") return "checking"
    if (isAvailable) return "available"
    if (!isAvailable) return "not-available"
    return "unknown"
  }

  const availability = useDebounce(getAvailabilityState(), 100)

  useEffect(() => {
    if (debouncedName) {
      submit(
        { name: debouncedName, intent: Intent.CHECK_AVAILABILITY },
        { method: "POST", action: "/api/new-organization" }
      )
    }
  }, [debouncedName, submit])

  const close = () => setSearchParams("")

  return (
    <Modal isOpen onOpenChange={(isOpen) => !isOpen && close()}>
      <Modal.Backdrop className="bg-black/40 backdrop-blur-sm">
        <Modal.Container>
          <Modal.Dialog>
            <Form
              method="POST"
              action="/api/new-organization"
              className="w-full flex items-center justify-center"
            >
              <div className="relative w-full max-w-md overflow-hidden flex flex-col gap-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                    <Building2 size={20} className="text-accent" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold tracking-wide text-foreground">
                      New organization
                    </h2>
                    <p className="text-sm text-foreground/40">Set up a workspace for your team</p>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <TextField
                    name="name"
                    onChange={(value) => setName(value)}
                    variant="secondary"
                    autoFocus
                  >
                    <Label className="text-sm font-medium text-foreground/60">
                      Organization name
                    </Label>
                    <Input placeholder="Acme Inc." className="mt-1" />
                  </TextField>
                  <AvailabilityIndicator availability={availability} />
                  <p className="text-xs text-foreground/40">
                    {/* The real path (as in settings), not a made-up domain. */}
                    /app/o/
                    <span className="font-medium text-accent">
                      {name ? slugify(name, { lower: true, trim: true }) : "your-org"}
                    </span>
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3">
                  <Button variant="ghost" onPress={close}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    name="intent"
                    value={Intent.CREATE_ORGANIZATION}
                    isDisabled={availability !== "available"}
                    variant="primary"
                  >
                    Create organization
                  </Button>
                </div>
              </div>
            </Form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}

export default NewOrganization
