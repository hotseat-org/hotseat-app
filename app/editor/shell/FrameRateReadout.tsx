import type { FrameStats } from "../scene/FpsMeter"
import { useI18n } from "~/i18n/I18nProvider"

const getFrameRateColor = (fps: number) => {
  if (fps >= 55) return "text-success"
  if (fps >= 30) return "text-warning"

  return "text-danger"
}

/** The perf HUD's reading, on one line: frames per second (coloured by how smooth), frame time and what's drawn. */
export const FrameRateReadout = ({ stats }: { stats: FrameStats }) => {
  const { t, tn } = useI18n()

  return (
    <div className="flex items-baseline gap-3 whitespace-nowrap rounded-xl border border-border bg-overlay px-3 py-1.5 font-mono text-sm tabular-nums text-foreground shadow-overlay">
      <span>
        <span className={getFrameRateColor(stats.fps)}>{stats.fps.toFixed(0)}</span> FPS
      </span>
      <span className="text-xs text-muted">{stats.ms.toFixed(1)} ms</span>
      <span className="text-xs text-muted">{t("CPU {ms} ms", { ms: stats.cpuMs.toFixed(1) })}</span>
      <span className="text-xs text-muted">
        {tn(stats.drawCalls, "{n} draw call", "{n} draw calls")}
      </span>
      <span className="text-xs text-muted">{tn(stats.objects, "{n} object", "{n} objects")}</span>
    </div>
  )
}
