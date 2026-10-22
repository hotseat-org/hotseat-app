import { ToggleButton, Tooltip } from "@heroui/react"
import { Box, Clock, Feather } from "lucide-react"
import type { ReactNode } from "react"
import { useEditorStore, type OfficeView } from "../store"
import { hasWebGL } from "../webgl"
import { SkySlider } from "./SkySlider"
import { FitButton } from "./FitButton"
import { DateStepper } from "./DateStepper"

/**
 * Toggle that makes the scene follow the real local time. Dragging the slider
 * switches it off; pressing it again jumps back to "now".
 */
export const SyncTimeToggle = () => {
  const syncTime = useEditorStore((s) => s.syncTime)
  const setSyncTime = useEditorStore((s) => s.setSyncTime)
  return (
    <Tooltip delay={350}>
      <ToggleButton
        isIconOnly
        size="sm"
        variant="ghost"
        aria-label="Sync with real time"
        isSelected={syncTime}
        onChange={setSyncTime}
        className={
          syncTime
            ? "bg-accent/15 text-accent"
            : "text-muted hover:bg-foreground/10 hover:text-foreground"
        }
      >
        <Clock className="size-4" />
      </ToggleButton>
      <Tooltip.Content>{syncTime ? "Following real time" : "Sync with real time"}</Tooltip.Content>
    </Tooltip>
  )
}

/**
 * The bottom bar: fit view, real-time sync and the time-of-day slider that
 * drives the scene lighting (day → night), plus an optional trailing action
 * (Done while editing, Edit layout otherwise). Shared by the editor and the
 * office view dock so switching modes doesn't move or resize the bar.
 */
export const TimeOfDay = ({
  children,
  viewSwitch = false,
}: {
  children?: ReactNode
  /** Viewing (not editing): offer the 3D ⇄ 2D switch. */
  viewSwitch?: boolean
}) => {
  const timeOfDay = useEditorStore((s) => s.timeOfDay)
  const setTimeOfDay = useEditorStore((s) => s.setTimeOfDay)
  // A real office shows (and books) one day at a time — pick it here.
  const booking = useEditorStore((s) => s.booking.enabled)
  const view = useEditorStore((s) => s.view)
  const setView = useEditorStore((s) => s.setView)
  const webgl = hasWebGL()
  // The flat plan has no lighting: no time-of-day controls there.
  const flat = viewSwitch && (view === "2d" || !webgl)

  return (
    <div className="pointer-events-auto absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-border bg-overlay/90 p-2 text-foreground shadow-overlay backdrop-blur-md">
      <FitButton />
      {viewSwitch && webgl && <ViewSwitch view={view} onChange={setView} />}
      {!flat && <SyncTimeToggle />}
      {booking && <DateStepper />}
      {!flat && <SkySlider value={timeOfDay} onChange={setTimeOfDay} className="mx-1 w-56" />}
      {children && (
        <>
          <span className="mx-1 h-6 w-px bg-separator" aria-hidden />
          {/* Fixed width: swapping Done ⇄ Edit layout must not resize the bar. */}
          <div className="flex w-32 *:w-full">{children}</div>
        </>
      )}
    </div>
  )
}

/**
 * 3D scene ⇄ simple view (a light top-down plan, for devices that
 * struggle with 3D). The choice is remembered per browser.
 */
const ViewSwitch = ({
  view,
  onChange,
}: {
  view: OfficeView
  onChange: (view: OfficeView) => void
}) => (
  <div role="radiogroup" aria-label="View" className="flex rounded-xl bg-foreground/5 p-0.5">
    {(
      [
        ["3d", "3D view", Box, "3D"],
        ["2d", "Simple view — lighter, for slower devices", Feather, "Simple"],
      ] as const
    ).map(([value, label, Icon, short]) => (
      <Tooltip key={value} delay={350}>
        <button
          type="button"
          role="radio"
          aria-checked={view === value}
          aria-label={label}
          onClick={() => onChange(value)}
          className={
            "flex h-8 items-center gap-1 rounded-[10px] px-2 text-xs font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus " +
            (view === value
              ? "bg-overlay text-foreground shadow-sm"
              : "text-muted hover:text-foreground")
          }
        >
          <Icon className="size-3.5" />
          {short}
        </button>
        <Tooltip.Content>{label}</Tooltip.Content>
      </Tooltip>
    ))}
  </div>
)
