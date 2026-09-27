import { DeleteOrgDialog } from "../dialogs/DeleteOrg"
import { SettingsCard } from "../ui"
import { useSettings } from "../useSettings"
import { Button } from "~/components/Button"

export function OrgDanger() {
  const { dialog, openDialog } = useSettings()

  return (
    <>
      <SettingsCard className="flex flex-col gap-4 border-danger/40 sm:flex-row sm:items-center">
        <div className="flex-1">
          <p className="font-black text-foreground">Delete this organization</p>
          <p className="mt-1 text-sm text-muted">
            Deletes every office, desk assignment and member-specific setting in it. There is no
            going back.
          </p>
        </div>
        <Button variant="danger" onPress={() => openDialog("delete-org")}>
          Delete organization
        </Button>
      </SettingsCard>

      {dialog === "delete-org" && <DeleteOrgDialog />}
    </>
  )
}
