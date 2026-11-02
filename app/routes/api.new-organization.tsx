import { Spinner } from "@heroui/react"
import { useFetcher, useSearchParams } from "react-router"
import { redirect, type ActionFunctionArgs } from "react-router"
import { ImagePlus } from "lucide-react"
import slugify from "slugify"
import { z } from "zod"
import { Button } from "~/components/Button"
import {
  CreateDialog,
  BannerClose,
  ContourBanner,
  IMAGE_TYPES,
  TitleNameField,
  useImageUpload,
  useNameCheck,
} from "~/components/CreateModal"
import { isDemoVisitor } from "~/core/demo"
import { getCore } from "~/core/get-core"
import { useI18n } from "~/i18n/I18nProvider"
import { requireUser } from "~/services/session.server"

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

  // A demo visitor's own company starts with signing up for real.
  if (intent === Intent.CREATE_ORGANIZATION && isDemoVisitor(user.email)) return redirect("/logout")

  if (intent === Intent.CREATE_ORGANIZATION) {
    const thumbnail = formData.get("thumbnail")
    const organization = await core.organization.create({
      name,
      userEmail: user.email,
      thumbnail: typeof thumbnail === "string" && thumbnail ? thumbnail : undefined,
    })

    return redirect(`/app/o/${organization.slug}`)
  }

  return null
}

export const NewOrganization = () => {
  const [_, setSearchParams] = useSearchParams()
  const { t } = useI18n()
  const { name, setName, availability } = useNameCheck({
    action: "/api/new-organization",
    intent: Intent.CHECK_AVAILABILITY,
  })
  const logo = useImageUpload()
  const create = useFetcher()
  const isCreating = create.state !== "idle"

  const close = () => setSearchParams("")

  return (
    <CreateDialog label={t("New organization")} onClose={close}>
      {(closeDialog) => (
        <create.Form method="POST" action="/api/new-organization">
          <input type="hidden" name="thumbnail" value={logo.id ?? ""} />
          <ContourBanner tone="accent" className="h-[150px]">
            <BannerClose onPress={closeDialog} />
          </ContourBanner>
          <div className="relative -mt-12 flex flex-col items-center gap-[18px] px-[30px] pb-7">
            {/* The logo overlaps the banner, like a profile picture. */}
            <label
              aria-label={logo.preview ? t("Change logo") : t("Add a logo")}
              className="relative flex size-24 cursor-pointer flex-col items-center justify-center gap-0.5 overflow-hidden rounded-full border-4 border-overlay bg-surface-secondary text-[11px] font-extrabold text-muted shadow-md"
            >
              <input
                type="file"
                accept={IMAGE_TYPES}
                className="sr-only"
                onChange={(e) => logo.pick(e.target.files?.[0])}
              />
              {logo.preview ? (
                <img
                  src={logo.preview}
                  alt=""
                  className="absolute inset-0 size-full object-cover"
                />
              ) : (
                <>
                  <ImagePlus size={22} />
                  {t("Logo")}
                </>
              )}
              {logo.isUploading && (
                <span className="absolute inset-0 flex items-center justify-center bg-overlay/60">
                  <Spinner size="sm" />
                </span>
              )}
            </label>
            <TitleNameField
              label={t("New organization")}
              placeholder={t("Name your team")}
              name={name}
              onChange={setName}
              path="…/o/"
              slug={slugify(name, { lower: true, trim: true })}
              availability={availability}
              isCentered
            />
            <p className="text-center text-[13px] leading-normal text-muted">
              {t("You'll be its admin. Invite your team once it's set up.")}
            </p>
            <div className="flex w-full flex-col gap-2">
              <Button
                type="submit"
                name="intent"
                value={Intent.CREATE_ORGANIZATION}
                isDisabled={availability !== "available" || logo.isUploading}
                isPending={isCreating}
                variant="primary"
                size="lg"
                fullWidth
              >
                {t("Create organization")}
              </Button>
              <Button type="button" variant="ghost" fullWidth onPress={closeDialog}>
                {t("Cancel")}
              </Button>
            </div>
          </div>
        </create.Form>
      )}
    </CreateDialog>
  )
}

export default NewOrganization
