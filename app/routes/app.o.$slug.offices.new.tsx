import { Modal, Spinner } from "@heroui/react"
import {
  useFetcher,
  useNavigate,
  useSearchParams,
  ActionFunctionArgs,
  LoaderFunctionArgs,
  redirect,
  useParams,
} from "react-router"
import { ImagePlus } from "lucide-react"
import { z } from "zod"
import { Button } from "~/components/Button"
import {
  BannerClose,
  ContourBanner,
  IMAGE_TYPES,
  TitleNameField,
  useImageUpload,
  useNameCheck,
} from "~/components/CreateModal"
import { officeSlugForName } from "~/core/office/slug"
import { getCore } from "~/core/get-core"
import { requireProfile } from "~/utils/loader-helpers/requireProfile"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"

enum Intent {
  CREATE_OFFICE = "createOffice",
  CHECK_AVAILABILITY = "checkAvailability",
}

// Creating offices is an admin's: anyone else is sent back to the organization.
export const loader = async (args: LoaderFunctionArgs) => {
  await requireProfile(args, { requiredRole: Role.ADMIN })
  return null
}

export const action = async (args: ActionFunctionArgs) => {
  const profile = await requireProfile(args, { requiredRole: Role.ADMIN })

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
  const action = `/app/o/${slug}/offices/new`
  const { name, setName, availability } = useNameCheck({
    action,
    intent: Intent.CHECK_AVAILABILITY,
  })
  const cover = useImageUpload()
  const create = useFetcher()
  const isCreating = create.state !== "idle"

  return (
    <Modal
      isOpen
      onOpenChange={(isOpen) => {
        if (!isOpen) close()
      }}
    >
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="overflow-hidden p-0">
            <create.Form method="POST" action={action}>
              <input type="hidden" name="thumbnail" value={cover.id ?? ""} />
              <ContourBanner image={cover.preview} className="h-[190px]">
                <BannerClose onPress={close} />
                {/* The whole banner picks the photo; the pill says so. */}
                <label className="absolute inset-0 flex cursor-pointer items-center justify-center">
                  <input
                    type="file"
                    accept={IMAGE_TYPES}
                    className="sr-only"
                    onChange={(e) => cover.pick(e.target.files?.[0])}
                  />
                  <span className="inline-flex h-[38px] items-center gap-2 rounded-full border border-border bg-overlay/90 px-4 text-[13px] font-extrabold text-foreground shadow-sm">
                    {cover.isUploading ? <Spinner size="sm" /> : <ImagePlus size={16} />}
                    {cover.preview ? "Change cover photo" : "Add a cover photo"}
                  </span>
                </label>
              </ContourBanner>
              <div className="flex flex-col gap-5 px-[30px] pt-[26px] pb-7">
                <TitleNameField
                  label="New office"
                  placeholder="Name your office"
                  name={name}
                  onChange={setName}
                  path="…/offices/"
                  slug={officeSlugForName(name)}
                  availability={availability}
                />
                <p className="text-[13px] leading-normal text-muted">
                  Next you&apos;ll lay out its floor, from a template or a blank plan.
                </p>
                <div className="flex justify-end gap-2.5">
                  <Button variant="ghost" type="button" onPress={close}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    name="intent"
                    value={Intent.CREATE_OFFICE}
                    isDisabled={availability !== "available" || cover.isUploading}
                    isPending={isCreating}
                    variant="primary"
                  >
                    Create office
                  </Button>
                </div>
              </div>
            </create.Form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}

export default NewOffice
