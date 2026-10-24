import { SettingsCard } from "../ui"
import { Button } from "~/components/Button"
import { useI18n } from "~/i18n/I18nProvider"

/**
 * Account deletion has no backend yet — shown honestly as unavailable rather
 * than as a button that silently does nothing.
 */
export function UserDanger() {
  const { t } = useI18n()
  return (
    <SettingsCard className="flex flex-col gap-4 border-danger/40 sm:flex-row sm:items-center">
      <div className="flex-1">
        <p className="font-black text-foreground">{t("Delete account")}</p>
        <p className="mt-1 text-sm text-muted">
          {t(
            "Account deletion isn't available yet. To stop using Hotseat, leave your organizations under Organizations."
          )}
        </p>
      </div>
      <Button variant="danger" isDisabled>
        {t("Delete account")}
      </Button>
    </SettingsCard>
  )
}
