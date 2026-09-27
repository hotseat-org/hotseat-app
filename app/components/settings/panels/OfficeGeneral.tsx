import { Input, Label, TextField } from "@heroui/react"
import { ImagePlus, Pencil } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useFetcher, useParams, useRouteLoaderData } from "react-router"
import { DeleteLogoDialog } from "../dialogs/DeleteLogo"
import { SetLogoDialog } from "../dialogs/SetLogo"
import { CardTitle, NameField, SaveBar, SettingsCard } from "../ui"
import { useFollowSlug, useRename } from "../useRename"
import { useSettings } from "../useSettings"
import { Button } from "~/components/Button"
import { enclosedRegions } from "~/components/OfficeEditor/layout"
import { isSeatable, type SceneObject } from "~/components/OfficeEditor/types"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"
import { useProfile } from "~/utils/remix"

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
  const fetcher = useFetcher<{ ok: boolean; slug?: string; error?: string }>()
  const action = `/api/settings/office/${slug}/${officeSlug}/general`

  // Like organizations: renaming renames the URL.
  const rename = useRename({ currentName: office?.name ?? "", currentSlug: officeSlug, action })
  useFollowSlug(fetcher, officeSlug, "/offices/")

  const [description, setDescription] = useState(office?.description ?? "")
  useEffect(() => setDescription(office?.description ?? ""), [office?.description])
  const dirty = rename.renamed || description !== (office?.description ?? "")

  // At a glance — from the saved layout (refreshed after every autosave).
  const stats = useMemo(() => {
    const objects = data?.initialObjects ?? []
    const desks = objects.filter((o) => isSeatable(o.type))
    const assigned = desks.filter((o) => o.assignee).length
    return [
      { label: "Desks", value: desks.length },
      { label: "Assigned", value: assigned },
      { label: "Free desks", value: desks.length - assigned },
      { label: "Rooms", value: enclosedRegions(objects).length },
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
              className="flex h-36 w-56 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-surface-secondary text-sm font-bold text-muted transition-colors enabled:hover:border-accent/50 enabled:hover:text-accent disabled:cursor-default"
            >
              <ImagePlus className="size-6" />
              {isAdmin ? "Upload a cover" : "No cover"}
            </button>
          )}
          {isAdmin && office.thumbnail && (
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onPress={() => openDialog("set-cover")}>
                Change
              </Button>
              <Button size="sm" variant="danger-soft" onPress={() => openDialog("delete-cover")}>
                Remove
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
              warning="Renaming changes this office's URL. Old links to it stop working."
            />
            <TextField name="description" value={description} onChange={setDescription}>
              <Label>Description</Label>
              <Input placeholder="e.g. 3rd floor, entrance from the courtyard (optional)" />
            </TextField>
          </fieldset>
          {!isAdmin && <p className="text-xs text-muted">Only admins can edit office details.</p>}
          {fetcher.data?.ok === false && fetcher.data.error && (
            <p className="text-sm font-bold text-danger">{fetcher.data.error}</p>
          )}
        </fetcher.Form>
      </SettingsCard>

      <SettingsCard className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <CardTitle>At a glance</CardTitle>
          <Button
            size="sm"
            variant="primary"
            onPress={() => {
              close()
              window.dispatchEvent(new Event(EDIT_LAYOUT_EVENT))
            }}
          >
            <Pencil className="size-4" /> Edit layout
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl bg-surface-secondary px-4 py-3.5">
              <p className="text-2xl font-black tabular-nums text-foreground">{s.value}</p>
              <p className="text-sm text-muted">{s.label}</p>
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
        <SetLogoDialog action={action} intent="set-cover" title="Office cover" />
      )}
      {dialog === "delete-cover" && (
        <DeleteLogoDialog
          action={action}
          intent="delete-cover"
          title="Remove this office's cover?"
        />
      )}
    </>
  )
}
