import { Description, Input, Label, TextField } from "@heroui/react"
import { Download } from "lucide-react"
import { useEffect, useState } from "react"
import { useFetcher, useParams } from "react-router"
import { DeleteLogoDialog } from "../dialogs/DeleteLogo"
import { SetLogoDialog } from "../dialogs/SetLogo"
import { CardTitle, NameField, SaveBar, SettingsCard } from "../ui"
import { useRename } from "../useRename"
import { useSettings } from "../useSettings"
import { Button } from "~/components/Button"
import { ThumbAvatar } from "~/components/office/shell-ui"
import { useOrganizationContext } from "~/utils/hooks/useProfileData"
import { useIsSelfHosted } from "~/edition/edition"
import { useI18n } from "~/i18n/I18nProvider"

const FORM = "org-general"

export function OrgGeneral() {
  const { slug = "" } = useParams()
  const { organization } = useOrganizationContext()
  const { dialog, openDialog } = useSettings()
  const { t } = useI18n()
  const fetcher = useFetcher<{ ok: boolean; slug?: string; error?: string }>()
  const action = `/api/settings/org/${slug}/general`

  // Renaming renames the URL too (same rule as on create).
  const rename = useRename({ currentName: organization.name, currentSlug: slug, action })

  const [description, setDescription] = useState(organization.description ?? "")
  useEffect(() => setDescription(organization.description ?? ""), [organization.description])
  // Self-hosted: who joins by their email's domain, as one line of text.
  const isSelfHosted = useIsSelfHosted()
  const savedDomains = (organization.allowedDomains ?? []).join(", ")
  const [domains, setDomains] = useState(savedDomains)
  useEffect(() => setDomains(savedDomains), [savedDomains])
  const dirty =
    rename.renamed ||
    description !== (organization.description ?? "") ||
    (isSelfHosted && domains !== savedDomains)

  return (
    <>
      <SettingsCard className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
        <ThumbAvatar
          src={organization.thumbnailUrl}
          fallback={organization.name.slice(0, 1).toUpperCase()}
          className="size-21 shrink-0 rounded-3xl text-3xl"
        />
        <div className="flex flex-col gap-2">
          <CardTitle>{t("Logo")}</CardTitle>
          <p className="text-sm text-muted">
            {t("Square image, at least 256 × 256. Shown in the switcher and on invites.")}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onPress={() => openDialog("set-logo")}>
              {t("Upload new")}
            </Button>
            {organization.thumbnailUrl && (
              <Button size="sm" variant="danger-soft" onPress={() => openDialog("delete-logo")}>
                {t("Remove")}
              </Button>
            )}
          </div>
        </div>
      </SettingsCard>

      <SettingsCard>
        <fetcher.Form id={FORM} method="POST" action={action} className="flex flex-col gap-5">
          <input type="hidden" name="intent" value="update-general" />
          <NameField
            rename={rename}
            urlPrefix="/app/o/"
            warning={t(
              "Renaming changes the URL. Old links and invite links keep working — they forward to the new one."
            )}
          />
          <TextField name="description" value={description} onChange={setDescription}>
            <Label>{t("Description")}</Label>
            <Input placeholder={t("What your organization is about (optional)")} />
          </TextField>
          {isSelfHosted && (
            <TextField name="allowedDomains" value={domains} onChange={setDomains}>
              <Label>{t("Who can join")}</Label>
              <Input placeholder="acme.com, acme.cz" />
              <Description>
                {t(
                  "Anyone signing in with an email at these domains joins straight away. Leave it empty to invite people yourself."
                )}
              </Description>
            </TextField>
          )}
          {fetcher.data?.ok === false && fetcher.data.error && (
            <p className="text-sm font-bold text-danger">{fetcher.data.error}</p>
          )}
        </fetcher.Form>
      </SettingsCard>

      {/* The whole organization in a file: what its own Hotseat starts from
          (the setup screen takes it), or a copy to keep. */}
      <SettingsCard className="flex flex-col items-start gap-2">
        <CardTitle>{t("Take a copy")}</CardTitle>
        <p className="text-sm text-muted">
          {t(
            "Everything in this organization, in one file: offices, people, teams, bookings and their history. Start your own Hotseat from it, or keep it as a backup."
          )}
        </p>
        <Button
          size="sm"
          variant="secondary"
          className="mt-2"
          onPress={() => window.location.assign(`${import.meta.env.BASE_URL}api/export/${slug}`)}
        >
          <Download className="size-4" /> {t("Download a copy")}
        </Button>
      </SettingsCard>

      <SaveBar
        form={FORM}
        dirty={dirty}
        isPending={fetcher.state !== "idle"}
        isDisabled={rename.taken || !rename.slug}
        onDiscard={() => {
          rename.setName(organization.name)
          setDescription(organization.description ?? "")
          setDomains(savedDomains)
        }}
      />

      {dialog === "set-logo" && <SetLogoDialog />}
      {dialog === "delete-logo" && <DeleteLogoDialog />}
    </>
  )
}
