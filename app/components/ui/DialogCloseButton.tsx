import clsx from "clsx"
import { X } from "lucide-react"
import { useI18n } from "~/i18n/I18nProvider"

/**
 * A dialog's close button, the same everywhere: a ring of ink round an ✕ (the
 * headline's icon buttons, as the day's arrows), named "Close" in the
 * reader's language. Pages, dialogs, sheets and the desk use it, so they close
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

  return (
    <button
      type="button"
      aria-label={label ?? t("Close")}
      onClick={onClose}
      className={clsx(
        "grid size-11 shrink-0 cursor-pointer place-items-center rounded-full border-2 border-foreground text-foreground outline-none transition-colors hover:bg-foreground hover:text-background focus-visible:ring-2 focus-visible:ring-focus",
        className
      )}
    >
      <X className="size-5" strokeWidth={2.4} />
    </button>
  )
}
