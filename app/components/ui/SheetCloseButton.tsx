import clsx from "clsx"
import { X } from "lucide-react"

/**
 * A bottom sheet's close button: HeroUI's close button's look, a plain
 * button's click — React Aria's press doesn't finish inside a sheet's swipe
 * area (see useSwipeToClose).
 */
export const SheetCloseButton = ({
  label,
  onClose,
  className,
}: {
  label: string
  onClose: () => void
  className?: string
}) => (
  <button
    type="button"
    aria-label={label}
    onClick={onClose}
    className={clsx("close-button close-button--default", className)}
  >
    <X className="size-4" />
  </button>
)
