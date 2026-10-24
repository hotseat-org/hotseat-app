import { DeleteOrgDialog } from "../dialogs/DeleteOrg"
import { SettingsCard } from "../ui"
import { useSettings } from "../useSettings"
import { Button } from "~/components/Button"
import { useI18n } from "~/i18n/I18nProvider"

export function OrgDanger() {
  const { dialog, openDialog } = useSettings()
  const { t } = useI18n()

  return (
    <>
      <SettingsCard className="flex flex-col gap-4 border-danger/40 sm:flex-row sm:items-center">
        <div className="flex-1">
          <p className="font-black text-foreground">{t("Delete this organization")}</p>
          <p className="mt-1 text-sm text-muted">
            {t(
              "Deletes every office, desk assignment and member-specific setting in it. There is no going back."
            )}
          </p>
        </div>
        <Button variant="danger" onPress={() => openDialog("delete-org")}>
          {t("Delete organization")}
        </Button>
      </SettingsCard>

      {dialog === "delete-org" && <DeleteOrgDialog />}
    </>
  )
}
