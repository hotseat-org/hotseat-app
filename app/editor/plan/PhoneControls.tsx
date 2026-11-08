import { RotateCcw, RotateCw, Scan } from "lucide-react"
import { useI18n } from "~/i18n/I18nProvider"

/**
 * A phone: turn and fit, bottom-right above the shell (no dock there).
 * Elsewhere they're in the map controls, bottom-left.
 */
const RING =
  "grid size-11 shrink-0 place-items-center rounded-full border-2 border-foreground bg-background text-foreground outline-none focus-visible:ring-2 focus-visible:ring-focus"

export const PhoneControls = ({
  bottom,
  onTurn,
  onFit,
}: {
  bottom: number
  onTurn: (quarters: number) => void
  onFit: () => void
}) => {
  const { t } = useI18n()

  return (
    // Rings of ink, as every icon button, filled with the page so they read over the plan.
    <div
      className="absolute right-4 flex gap-2"
      style={{ bottom }}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className={RING}
        aria-label={t("Turn view left")}
        onClick={() => onTurn(1)}
      >
        <RotateCcw className="size-4" />
      </button>
      <button
        type="button"
        className={RING}
        aria-label={t("Turn view right")}
        onClick={() => onTurn(-1)}
      >
        <RotateCw className="size-4" />
      </button>
      <button type="button" className={RING} aria-label={t("Fit the office")} onClick={onFit}>
        <Scan className="size-4" />
      </button>
    </div>
  )
}
