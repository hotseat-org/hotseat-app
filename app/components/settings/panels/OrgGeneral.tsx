import { Input, Label, TextField } from "@heroui/react"
import { useEffect, useState } from "react"
import { useFetcher, useParams } from "react-router"
import { DeleteLogoDialog } from "../dialogs/DeleteLogo"
import { SetLogoDialog } from "../dialogs/SetLogo"
import { CardTitle, NameField, SaveBar, SettingsCard } from "../ui"
import { useFollowSlug, useRename } from "../useRename"
import { useSettings } from "../useSettings"
import { Button } from "~/components/Button"
import { ThumbAvatar } from "~/components/office/shell-ui"
import { useOrganizationContext } from "~/utils/hooks/useProfileData"

const FORM = "org-general"

export function OrgGeneral() {
  const { slug = "" } = useParams()
  const { organization } = useOrganizationContext()
  const { dialog, openDialog } = useSettings()
  const fetcher = useFetcher<{ ok: boolean; slug?: string; error?: string }>()
  const action = `/api/settings/org/${slug}/general`

  // Renaming renames the URL too (same rule as on create).
  const rename = useRename({ currentName: organization.name, currentSlug: slug, action })
  useFollowSlug(fetcher, slug, "/app/o/")

  const [description, setDescription] = useState(organization.description ?? "")
  useEffect(() => setDescription(organization.description ?? ""), [organization.description])
  const dirty = rename.renamed || description !== (organization.description ?? "")

  return (
    <>
      <SettingsCard className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
        <ThumbAvatar
          src={organization.thumbnailUrl}
          fallback={organization.name.slice(0, 1).toUpperCase()}
          className="size-21 shrink-0 rounded-3xl text-3xl"
        />
        <div className="flex flex-col gap-2">
          <CardTitle>Logo</CardTitle>
          <p className="text-sm text-muted">
            Square image, at least 256 × 256. Shown in the switcher and on invites.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onPress={() => openDialog("set-logo")}>
              Upload new
            </Button>
            {organization.thumbnailUrl && (
              <Button size="sm" variant="danger-soft" onPress={() => openDialog("delete-logo")}>
                Remove
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
            warning="Renaming changes the URL. Old links and invite links stop working — share the new invite link afterwards."
          />
          <TextField name="description" value={description} onChange={setDescription}>
            <Label>Description</Label>
            <Input placeholder="What your organization is about (optional)" />
          </TextField>
          {fetcher.data?.ok === false && fetcher.data.error && (
            <p className="text-sm font-bold text-danger">{fetcher.data.error}</p>
          )}
        </fetcher.Form>
      </SettingsCard>

      <SaveBar
        form={FORM}
        dirty={dirty}
        isPending={fetcher.state !== "idle"}
        isDisabled={rename.taken || !rename.slug}
        onDiscard={() => {
          rename.setName(organization.name)
          setDescription(organization.description ?? "")
        }}
      />

      {dialog === "set-logo" && <SetLogoDialog />}
      {dialog === "delete-logo" && <DeleteLogoDialog />}
    </>
  )
}
