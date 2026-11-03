import clsx from "clsx"
import { ChevronDown, ChevronUp } from "lucide-react"
import { useI18n } from "~/i18n/I18nProvider"

/**
 * More to see that way: a fade over a scrolling box's edge (in the overlay's
 * colour), and an arrow to scroll there. See useScrollHints.
 */
export const ScrollHint = ({
  direction,
  isShown,
  onPress,
}: {
  direction: 1 | -1
  isShown: boolean
  onPress: () => void
}) => {
  const { t } = useI18n()
  const isDown = direction === 1

  return (
    <div
      className={clsx(
        "pointer-events-none absolute inset-x-0 z-10 flex h-10 justify-center from-overlay to-transparent transition-opacity duration-200",
        isDown
          ? "bottom-0 items-end bg-gradient-to-t pb-1"
          : "top-0 items-start bg-gradient-to-b pt-1",
        isShown ? "opacity-100" : "opacity-0"
      )}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        onClick={onPress}
        className={clsx(
          "grid size-6 place-items-center rounded-full border border-border bg-overlay text-muted shadow-overlay hover:text-foreground",
          isShown && "pointer-events-auto"
        )}
        title={isDown ? t("More below") : t("More above")}
      >
        {isDown ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
      </button>
    </div>
  )
}
