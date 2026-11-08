import { useFetcher, useSearchParams } from "react-router"
import { redirect, type ActionFunctionArgs } from "react-router"
import slugify from "slugify"
import { z } from "zod"
import { Button } from "~/components/Button"
import {
  CreateDialog,
  TitleNameField,
  useImageUpload,
  useNameCheck,
  CreateHeader,
  PictureWord,
} from "~/components/CreateModal"
import { isDemoVisitor } from "~/core/demo"
import { getCore } from "~/core/get-core"
import { requireSaas } from "~/edition/edition.server"
import { useI18n } from "~/i18n/I18nProvider"
import { requireUser } from "~/services/session.server"

enum Intent {
  CREATE_ORGANIZATION = "createOrganization",
  CHECK_AVAILABILITY = "checkAvailability",
}

export const action = async ({ request }: ActionFunctionArgs) => {
  // One company's own installation has one organization.
  requireSaas()

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
          {/* The headline's dialog (P5): the title, the name on a line, then the actions. */}
          <div className="flex flex-col gap-7 p-10">
            <CreateHeader
              title={t("New organization.")}
              summary={t("You'll be its admin. Invite your team once it's set up.")}
              onClose={closeDialog}
            />
            <TitleNameField
              label={t("Its name")}
              placeholder={t("Name your team")}
              name={name}
              onChange={setName}
              path="…/o/"
              slug={slugify(name, { lower: true, trim: true })}
              availability={availability}
            />
            <div className="flex flex-wrap items-center gap-x-7 gap-y-3">
              <Button
                type="submit"
                name="intent"
                value={Intent.CREATE_ORGANIZATION}
                isDisabled={availability !== "available" || logo.isUploading}
                isPending={isCreating}
                variant="primary"
                size="lg"
              >
                {t("Create organization")}
              </Button>
              <PictureWord
                upload={logo}
                addLabel={t("Add a logo")}
                changeLabel={t("Change logo")}
              />
              <span className="flex-1" />
              <Button type="button" variant="ghost" onPress={closeDialog}>
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
