import { CloseButton } from "@heroui/react"
import { useI18n } from "~/i18n/I18nProvider"

/**
 * A dialog's close button, the same everywhere: HeroUI's, named "Close" in
 * the reader's language. Modals, sheets and cards use it, so they close
 * alike.
 */
export const DialogCloseButton = ({
  onClose,
  label,
  className,
}: {
  onClose: () => void
  /** Its name, when "Close" alone wouldn't say it (none: "Close"). */
  label?: string
  className?: string
}) => {
  const { t } = useI18n()

  return <CloseButton aria-label={label ?? t("Close")} onPress={onClose} className={className} />
}
