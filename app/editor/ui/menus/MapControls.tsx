import clsx from "clsx"
import { Box, Feather, RotateCcw, RotateCw, ZoomOut } from "lucide-react"
import { useState, type ReactNode } from "react"
import { useEditorStore } from "../../store"
import { hasWebGL } from "../../shell/webgl"
import { REVEAL_LABEL } from "../bars/revealLabel"
import { MapMenu } from "./MapMenu"
import { useI18n } from "~/i18n/I18nProvider"
import { Hint, type HintPlacement } from "~/components/ui/Hint"

/**
 * The map's own controls, stacked bottom-left as in map apps: fit the office
 * (F), 3D ⇄ the simple view (viewing), turn the simple view (Q / E), and the
 * Map menu — what's shown, which desks.
 */
export const MapControls = ({
  isEditing = false,
  isRow = false,
}: {
  isEditing?: boolean
  /**
   * A row of icons (the office view's bottom bar), names in their tooltips:
   * it never changes width, so nothing beside it moves.
   */
  isRow?: boolean
}) => {
  const { t } = useI18n()
  const requestFit = useEditorStore((state) => state.requestFit)
  const view = useEditorStore((state) => state.view)
  const setView = useEditorStore((state) => state.setView)
  const turnPlan = useEditorStore((state) => state.turnPlan)
  const webgl = hasWebGL()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  // Editing is always 3D; without WebGL, viewing is the simple view.
  const is3d = isEditing || (webgl && view === "3d")
  // Names above a row (beside it they'd cover the time), beside a column.
  const hintPlacement = isRow ? "top" : "right"

  return (
    // Stays open while its Map menu is: the menu hangs off it, and mustn't
    // slide as the bar folds up under it.
    <div
      data-open={isMenuOpen || undefined}
      className={clsx(
        "pointer-events-auto flex gap-0.5 rounded-2xl p-1 text-foreground",
        // A column reveals its names on hover (group/bar); a row keeps to icons.
        isRow ? "flex-row items-center" : "group/bar flex-col items-stretch",
        // Viewing, icons straight on the paper (as the office's other chrome); editing, the tool's card.
        isEditing ? "border border-border bg-overlay shadow-overlay" : "on-ground"
      )}
    >
      <ControlButton
        label={t("Whole office")}
        title={t("Zoom out to the whole office (F)")}
        hintPlacement={hintPlacement}
        onPress={requestFit}
      >
        <ZoomOut className="size-[18px]" />
      </ControlButton>
      {!isEditing && webgl && (
        <ControlButton
          label={is3d ? t("Simple") : t("3D")}
          title={is3d ? t("Simple view — lighter, for slower devices") : t("3D view")}
          hintPlacement={hintPlacement}
          onPress={() => setView(is3d ? "2d" : "3d")}
        >
          {is3d ? <Feather className="size-[18px]" /> : <Box className="size-[18px]" />}
        </ControlButton>
      )}
      {!is3d && (
        // Turn left / right, one row (two arrows), named "Turn".
        <div className="flex h-9 items-center px-0.5 text-sm font-semibold text-muted">
          <TurnButton
            label={t("Turn view left")}
            hintPlacement={hintPlacement}
            onPress={() => turnPlan(1)}
          >
            <RotateCcw className="size-4" />
          </TurnButton>
          <TurnButton
            label={t("Turn view right")}
            hintPlacement={hintPlacement}
            onPress={() => turnPlan(-1)}
          >
            <RotateCw className="size-4" />
          </TurnButton>
          <span className={REVEAL_LABEL} aria-hidden>
            {t("Turn")}
          </span>
        </div>
      )}
      <span
        className={clsx("bg-separator", isRow ? "mx-0.5 h-6 w-px" : "mx-1.5 my-0.5 h-px")}
        aria-hidden
      />
      <MapMenu
        isEditing={isEditing}
        is3d={is3d}
        placement={isRow ? "top end" : "right bottom"}
        onOpenChange={setIsMenuOpen}
      />
    </div>
  )
}

/** A control with its name beside its icon, on hover (the tooltip adds detail, e.g. a key). */
const ControlButton = ({
  label,
  title,
  hintPlacement,
  onPress,
  children,
}: {
  label: string
  title: string
  hintPlacement: HintPlacement
  onPress: () => void
  children: ReactNode
}) => (
  <Hint text={title} placement={hintPlacement}>
    <button
      type="button"
      aria-label={title}
      onClick={onPress}
      className="flex h-9 items-center rounded-xl px-[9px] text-sm font-semibold text-muted outline-none transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
    >
      <span className="shrink-0">{children}</span>
      <span className={REVEAL_LABEL}>{label}</span>
    </button>
  </Hint>
)

const TurnButton = ({
  label,
  hintPlacement,
  onPress,
  children,
}: {
  label: string
  hintPlacement: HintPlacement
  onPress: () => void
  children: ReactNode
}) => (
  <Hint text={label} placement={hintPlacement}>
    <button
      type="button"
      aria-label={label}
      onClick={onPress}
      className="flex size-7 items-center justify-center rounded-lg text-muted outline-none transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
    >
      {children}
    </button>
  </Hint>
)
