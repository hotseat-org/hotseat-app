import { Tooltip } from "@heroui/react"
import { Box, Feather, Focus, RotateCcw, RotateCw } from "lucide-react"
import { useState, type ReactNode } from "react"
import { useEditorStore } from "../../store"
import { hasWebGL } from "../../shell/webgl"
import { REVEAL_LABEL } from "../bars/revealLabel"
import { MapMenu } from "./MapMenu"
import { useI18n } from "~/i18n/I18nProvider"

/**
 * The map's own controls, stacked bottom-left as in map apps: fit the office
 * (F), 3D ⇄ the simple view (viewing), turn the simple view (Q / E), and the
 * Map menu — what's shown, which desks.
 */
export const MapControls = ({ isEditing = false }: { isEditing?: boolean }) => {
  const { t } = useI18n()
  const requestFit = useEditorStore((state) => state.requestFit)
  const view = useEditorStore((state) => state.view)
  const setView = useEditorStore((state) => state.setView)
  const turnPlan = useEditorStore((state) => state.turnPlan)
  const webgl = hasWebGL()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  // Editing is always 3D; without WebGL, viewing is the simple view.
  const is3d = isEditing || (webgl && view === "3d")

  return (
    // Stays open while its Map menu is: the menu hangs off it, and mustn't
    // slide as the bar folds up under it.
    <div
      data-open={isMenuOpen || undefined}
      className="group/bar pointer-events-auto flex flex-col items-stretch gap-0.5 rounded-2xl border border-border bg-overlay/90 p-1 text-foreground shadow-overlay backdrop-blur-md"
    >
      <ControlButton label={t("Fit")} title={t("Fit to office (F)")} onPress={requestFit}>
        <Focus className="size-[18px]" />
      </ControlButton>
      {!isEditing && webgl && (
        <ControlButton
          label={is3d ? t("Simple") : t("3D")}
          title={is3d ? t("Simple view — lighter, for slower devices") : t("3D view")}
          onPress={() => setView(is3d ? "2d" : "3d")}
        >
          {is3d ? <Feather className="size-[18px]" /> : <Box className="size-[18px]" />}
        </ControlButton>
      )}
      {!is3d && (
        // Turn left / right, one row (two arrows), named "Turn".
        <div className="flex h-9 items-center px-0.5 text-sm font-semibold text-muted">
          <TurnButton label={t("Turn view left")} onPress={() => turnPlan(1)}>
            <RotateCcw className="size-4" />
          </TurnButton>
          <TurnButton label={t("Turn view right")} onPress={() => turnPlan(-1)}>
            <RotateCw className="size-4" />
          </TurnButton>
          <span className={REVEAL_LABEL} aria-hidden>
            {t("Turn")}
          </span>
        </div>
      )}
      <span className="mx-1.5 my-0.5 h-px bg-separator" aria-hidden />
      <MapMenu isEditing={isEditing} is3d={is3d} onOpenChange={setIsMenuOpen} />
    </div>
  )
}

/** A control with its name beside its icon, on hover (the tooltip adds detail, e.g. a key). */
const ControlButton = ({
  label,
  title,
  onPress,
  children,
}: {
  label: string
  title: string
  onPress: () => void
  children: ReactNode
}) => (
  <Tooltip delay={350}>
    <button
      type="button"
      aria-label={title}
      onClick={onPress}
      className="flex h-9 items-center rounded-xl px-[9px] text-sm font-semibold text-muted outline-none transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
    >
      <span className="shrink-0">{children}</span>
      <span className={REVEAL_LABEL}>{label}</span>
    </button>
    <Tooltip.Content placement="right">{title}</Tooltip.Content>
  </Tooltip>
)

const TurnButton = ({
  label,
  onPress,
  children,
}: {
  label: string
  onPress: () => void
  children: ReactNode
}) => (
  <Tooltip delay={350}>
    <button
      type="button"
      aria-label={label}
      onClick={onPress}
      className="flex size-7 items-center justify-center rounded-lg text-muted outline-none transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
    >
      {children}
    </button>
    <Tooltip.Content placement="right">{label}</Tooltip.Content>
  </Tooltip>
)
