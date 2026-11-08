import clsx from "clsx"
import type { ReactNode } from "react"
import { useEditorStore } from "../../store"
import { hasWebGL } from "../../shell/webgl"
import { useModules } from "../../modules"
import { SkySlider } from "./SkySlider"
import { useI18n } from "~/i18n/I18nProvider"

/**
 * The bottom bar — when: the day shown (a real office books one day at a
 * time) and the time of day that lights the scene, which follows the real
 * clock until it's dragged ("Now" goes back to it) — plus the main action
 * (Done while editing, Edit layout otherwise). The camera and what the map
 * shows live in the map controls (bottom-left). Shared by the editor and the
 * office view dock, so switching modes doesn't move or resize the bar.
 */
export const TimeOfDay = ({
  children,
  isViewing = false,
}: {
  children?: ReactNode
  /** Viewing (not editing): the simple view may be on, with no lighting to set. */
  isViewing?: boolean
}) => {
  const { t } = useI18n()
  const timeOfDay = useEditorStore((state) => state.timeOfDay)
  const setTimeOfDay = useEditorStore((state) => state.setTimeOfDay)
  const syncTime = useEditorStore((state) => state.syncTime)
  const setSyncTime = useEditorStore((state) => state.setSyncTime)
  const items = useModules().flatMap((module) => module.bottomBarItems ?? [])
  const view = useEditorStore((state) => state.view)
  // The flat plan has no lighting: no time-of-day there.
  const flat = isViewing && (view === "2d" || !hasWebGL())

  return (
    // Viewing, it's a strip of the office's paper (no card, as the office's
    // other chrome); editing, the tool's bar.
    <div
      className={clsx(
        "pointer-events-auto absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-2xl p-2 text-foreground",
        isViewing ? "bg-background" : "border border-border bg-overlay shadow-overlay"
      )}
    >
      {/* The modules' (the office: the day shown). */}
      {items.map((Item, index) => (
        <Item key={index} />
      ))}
      {!flat && (
        <div className="flex items-center gap-1.5">
          <SkySlider value={timeOfDay} onChange={setTimeOfDay} className="mx-1 w-56" />
          {/* Back to the real time — its room kept while following it, so the
              bar never changes width. */}
          <button
            type="button"
            onClick={() => setSyncTime(true)}
            aria-hidden={syncTime}
            tabIndex={syncTime ? -1 : undefined}
            className={clsx(
              "h-7 rounded-lg px-2 text-xs font-bold text-accent transition-opacity hover:bg-accent/10",
              syncTime && "pointer-events-none opacity-0"
            )}
          >
            {t("Now")}
          </button>
        </div>
      )}
      {children && (
        <>
          <span className="mx-1 h-6 w-px bg-separator" aria-hidden />
          {/* Edit layout ⇄ Done share a least width (min-w-32), so swapping them
              barely resizes the bar — and a longer translation still fits. */}
          <div className="flex items-center gap-2">{children}</div>
        </>
      )}
    </div>
  )
}
