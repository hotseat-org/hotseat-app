import clsx from "clsx"
import { BarChart3, Flame, X } from "lucide-react"
import { useEffect } from "react"
import { heatGradient, PERIOD_LABEL } from "../heatmap"
import { useEditorStore } from "../../store"
import { useI18n } from "~/i18n/I18nProvider"

/**
 * While the Insights heatmap is over the office: which period, the scale, a
 * way back to the dashboard, and a close. Floats at the top, centred.
 */
export const HeatmapPill = ({ isDark, className }: { isDark: boolean; className?: string }) => {
  const { t } = useI18n()
  const heatmap = useEditorStore((state) => state.heatmap)
  const setHeatmap = useEditorStore((state) => state.setHeatmap)
  const setInsightsOpen = useEditorStore((state) => state.setInsightsOpen)
  const isInsightsOpen = useEditorStore((state) => state.isInsightsOpen)

  useEffect(() => {
    if (!heatmap || isInsightsOpen) return
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setHeatmap(null)
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [heatmap, isInsightsOpen, setHeatmap])

  if (!heatmap) return null
  return (
    <div
      role="status"
      className={clsx(
        "pointer-events-auto flex items-center gap-3 rounded-full border border-chrome-border bg-chrome/95 py-1.5 pl-2 pr-1.5 shadow-overlay backdrop-blur-md",
        className
      )}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent/15 text-accent">
        <Flame className="size-[18px]" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-extrabold text-foreground">
          {t("Desks in use · {period}", { period: t(PERIOD_LABEL[heatmap.period]).toLowerCase() })}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          {t("Quiet")}
          <span
            aria-hidden
            className="h-2 w-20 rounded-full sm:w-28"
            style={{ background: heatGradient(isDark) }}
          />
          {t("Busy")}
        </span>
      </span>
      <button
        type="button"
        onClick={() => setInsightsOpen(true)}
        className="flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-bold text-accent transition-colors hover:bg-accent/10"
      >
        <BarChart3 className="size-4" />
        <span className="hidden sm:inline">{t("Dashboard")}</span>
      </button>
      <button
        type="button"
        aria-label={t("Hide the heatmap")}
        onClick={() => setHeatmap(null)}
        className="grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-foreground/5 hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}
