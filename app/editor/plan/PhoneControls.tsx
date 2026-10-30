import { Button } from "@heroui/react"
import { RotateCcw, RotateCw, Scan } from "lucide-react"
import { useI18n } from "~/i18n/I18nProvider"

/**
 * A phone: turn and fit, bottom-right above the shell (no dock there).
 * Elsewhere they're in the map controls, bottom-left.
 */
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
    <div
      className="absolute right-4 flex gap-1 rounded-xl border border-chrome-border bg-chrome/95 p-1 shadow-overlay backdrop-blur-md"
      style={{ bottom }}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <Button
        isIconOnly
        size="md"
        variant="ghost"
        aria-label={t("Turn view left")}
        onPress={() => onTurn(1)}
      >
        <RotateCcw className="size-4" />
      </Button>
      <Button
        isIconOnly
        size="md"
        variant="ghost"
        aria-label={t("Turn view right")}
        onPress={() => onTurn(-1)}
      >
        <RotateCw className="size-4" />
      </Button>
      <Button isIconOnly size="md" variant="ghost" aria-label={t("Fit the office")} onPress={onFit}>
        <Scan className="size-4" />
      </Button>
    </div>
  )
}
