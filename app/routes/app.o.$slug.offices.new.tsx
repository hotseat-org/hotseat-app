import {
  useFetcher,
  useNavigate,
  useSearchParams,
  ActionFunctionArgs,
  LoaderFunctionArgs,
  redirect,
  useParams,
} from "react-router"
import { useEffect, useState } from "react"
import { z } from "zod"
import { getBrowserTimeZone, isTimeZone } from "~/utils/timeZone"
import { Button } from "~/components/Button"
import {
  CreateDialog,
  TitleNameField,
  useImageUpload,
  useNameCheck,
  CreateHeader,
  PictureWord,
} from "~/components/CreateModal"
import { officeSlugForName } from "~/core/office/slug"
import { useI18n } from "~/i18n/I18nProvider"
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
    // The creator's browser's: where the office most likely is (changeable in its settings).
    const timezone = formData.get("timezone")

    const office = await core.office.create({
      name,
      organizationSlug: profile.organizationSlug,
      thumbnail,
      userEmail: profile.userEmail,
      timezone: isTimeZone(timezone) ? timezone : undefined,
    })

    return redirect(`/app/o/${office.organizationSlug}/offices/${office.slug}`)
  }

  return null
}

export const NewOffice = () => {
  const { slug } = useParams()
  const { t } = useI18n()
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
  // Where the person creating it is (the browser knows; the server doesn't).
  const [timeZone, setTimeZone] = useState("")
  useEffect(() => setTimeZone(getBrowserTimeZone() ?? ""), [])
  const create = useFetcher()
  const isCreating = create.state !== "idle"

  return (
    <CreateDialog label={t("New office")} onClose={close}>
      {(closeDialog) => (
        <create.Form method="POST" action={action}>
          <input type="hidden" name="thumbnail" value={cover.id ?? ""} />
          <input type="hidden" name="timezone" value={timeZone} />
          {/* The headline's dialog (P5): the title, the name on a line, then the actions. */}
          <div className="flex flex-col gap-7 p-10">
            <CreateHeader
              title={t("New office.")}
              summary={t("Next you'll lay out its floor, from a template or a blank plan.")}
              onClose={closeDialog}
            />
            <TitleNameField
              label={t("Its name")}
              placeholder={t("Name your office")}
              name={name}
              onChange={setName}
              path="…/offices/"
              slug={officeSlugForName(name)}
              availability={availability}
            />
            <div className="flex flex-wrap items-center gap-x-7 gap-y-3">
              <Button
                type="submit"
                name="intent"
                value={Intent.CREATE_OFFICE}
                isDisabled={availability !== "available" || cover.isUploading}
                isPending={isCreating}
                variant="primary"
                size="lg"
              >
                {t("Create office")}
              </Button>
              <PictureWord
                upload={cover}
                addLabel={t("Add a cover photo")}
                changeLabel={t("Change cover photo")}
              />
              <span className="flex-1" />
              <Button variant="ghost" type="button" onPress={closeDialog}>
                {t("Cancel")}
              </Button>
            </div>
          </div>
        </create.Form>
      )}
    </CreateDialog>
  )
}

export default NewOffice
