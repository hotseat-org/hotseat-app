import { Input, Label, TextField } from "@heroui/react"
import { ImagePlus, Pencil } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useFetcher, useParams, useRouteLoaderData } from "react-router"
import { DeleteLogoDialog } from "../dialogs/DeleteLogo"
import { SetLogoDialog } from "../dialogs/SetLogo"
import { CardTitle, NameField, SaveBar, SettingsCard } from "../ui"
import { useRename } from "../useRename"
import { useSettings } from "../useSettings"
import { officeSlugForName } from "~/core/office/slug"
import { Button } from "~/components/Button"
import { enclosedRegions } from "~/editor/core"
import { type SceneObject } from "~/editor/core"
import { isSeatable } from "~/office/catalog"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"
import { useProfile } from "~/utils/remix"
import { useI18n } from "~/i18n/I18nProvider"
import { msg } from "~/i18n/msg"

interface OfficeRouteData {
  office: { name: string; slug: string; description?: string; thumbnail?: string }
  initialObjects: SceneObject[]
}

/** The office's loader data (the office layout stays mounted under the modal). */
export const useOfficeData = () =>
  useRouteLoaderData("routes/app.o.$slug.offices.$officeSlug") as OfficeRouteData | undefined

/** Asks the office view to switch into layout editing (see OfficeEditor). */
export const EDIT_LAYOUT_EVENT = "hotseat:edit-layout"

const FORM = "office-general"

export function OfficeGeneral() {
  const { slug = "", officeSlug = "" } = useParams()
  const data = useOfficeData()
  const office = data?.office
  const isAdmin = useProfile().role === Role.ADMIN
  const { dialog, openDialog, close } = useSettings()
  const { t } = useI18n()
  const fetcher = useFetcher<{ ok: boolean; slug?: string; error?: string }>()
  const action = `/api/settings/office/${slug}/${officeSlug}/general`

  // Like organizations: renaming renames the URL.
  const rename = useRename({
    currentName: office?.name ?? "",
    currentSlug: officeSlug,
    action,
    slugFor: officeSlugForName,
  })

  const [description, setDescription] = useState(office?.description ?? "")
  useEffect(() => setDescription(office?.description ?? ""), [office?.description])
  const dirty = rename.renamed || description !== (office?.description ?? "")

  // At a glance — from the saved layout (refreshed after every autosave).
  const stats = useMemo(() => {
    const objects = data?.initialObjects ?? []
    const desks = objects.filter((o) => isSeatable(o.type))
    const assigned = desks.filter((o) => o.assignee).length
    return [
      { label: msg("Desks"), value: desks.length },
      { label: msg("Assigned"), value: assigned },
      { label: msg("Free desks"), value: desks.length - assigned },
      { label: msg("Rooms"), value: enclosedRegions(objects).length },
    ]
  }, [data?.initialObjects])

  if (!office) return null

  return (
    <>
      <SettingsCard className="flex flex-col gap-6 sm:flex-row">
        <div className="flex shrink-0 flex-col gap-2">
          {office.thumbnail ? (
            <img
              src={office.thumbnail}
              alt=""
              className="h-36 w-56 rounded-2xl border border-border object-cover"
            />
          ) : (
            <button
              type="button"
              disabled={!isAdmin}
              onClick={() => openDialog("set-cover")}
              className="flex h-36 w-56 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-surface text-sm font-bold text-muted transition-colors enabled:hover:border-accent/50 enabled:hover:text-accent disabled:cursor-default"
            >
              <ImagePlus className="size-6" />
              {isAdmin ? t("Upload a cover") : t("No cover")}
            </button>
          )}
          {isAdmin && office.thumbnail && (
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onPress={() => openDialog("set-cover")}>
                {t("Change")}
              </Button>
              <Button size="sm" variant="danger-soft" onPress={() => openDialog("delete-cover")}>
                {t("Remove")}
              </Button>
            </div>
          )}
        </div>

        <fetcher.Form
          id={FORM}
          method="POST"
          action={action}
          className="flex flex-1 flex-col gap-5"
        >
          <input type="hidden" name="intent" value="update-general" />
          <fieldset disabled={!isAdmin} className="contents">
            <NameField
              rename={rename}
              urlPrefix={`/app/o/${slug}/offices/`}
              warning={t(
                "Renaming changes this office's URL. Old links to it keep working — they forward to the new one."
              )}
            />
            <TextField name="description" value={description} onChange={setDescription}>
              <Label>{t("Description")}</Label>
              <Input placeholder={t("e.g. 3rd floor, entrance from the courtyard (optional)")} />
            </TextField>
          </fieldset>
          {!isAdmin && (
            <p className="text-xs text-muted">{t("Only admins can edit office details.")}</p>
          )}
          {fetcher.data?.ok === false && fetcher.data.error && (
            <p className="text-sm font-bold text-danger">{fetcher.data.error}</p>
          )}
        </fetcher.Form>
      </SettingsCard>

      <SettingsCard className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <CardTitle>{t("At a glance")}</CardTitle>
          {/* The editor is computer-only (CSS, not a hook: right in the first paint). */}
          <Button
            size="sm"
            variant="primary"
            className="max-md:hidden"
            onPress={() => {
              close()
              window.dispatchEvent(new Event(EDIT_LAYOUT_EVENT))
            }}
          >
            <Pencil className="size-4" /> {t("Edit layout")}
          </Button>
          <p className="text-right text-xs text-muted md:hidden">
            {t("Edit the layout on a computer")}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl bg-surface px-4 py-3.5">
              <p className="text-2xl font-black tabular-nums text-foreground">{s.value}</p>
              <p className="text-sm text-muted">{t(s.label)}</p>
            </div>
          ))}
        </div>
      </SettingsCard>

      {isAdmin && (
        <SaveBar
          form={FORM}
          dirty={dirty}
          isPending={fetcher.state !== "idle"}
          isDisabled={rename.taken || !rename.slug}
          onDiscard={() => {
            rename.setName(office.name)
            setDescription(office.description ?? "")
          }}
        />
      )}

      {dialog === "set-cover" && (
        <SetLogoDialog action={action} intent="set-cover" title={t("Office cover")} />
      )}
      {dialog === "delete-cover" && (
        <DeleteLogoDialog
          action={action}
          intent="delete-cover"
          title={t("Remove this office's cover?")}
        />
      )}
    </>
  )
}
