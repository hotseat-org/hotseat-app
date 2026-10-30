import type { FrameStats } from "../scene/FpsMeter"
import { useI18n } from "~/i18n/I18nProvider"

const getFrameRateColor = (fps: number) => {
  if (fps >= 55) return "text-success"
  if (fps >= 30) return "text-warning"

  return "text-danger"
}

/** The perf HUD's reading: frames per second (coloured by how smooth), frame time and what's drawn. */
export const FrameRateReadout = ({ stats }: { stats: FrameStats }) => {
  const { t, tn } = useI18n()

  return (
    <div className="rounded-xl border border-border bg-overlay/95 px-3 py-2 font-mono text-sm text-foreground shadow-overlay backdrop-blur-md">
      <span className="tabular-nums">
        <span className={getFrameRateColor(stats.fps)}>{stats.fps.toFixed(0)}</span> FPS
        <span className="ml-2 text-muted">{stats.ms.toFixed(1)} ms</span>
        {/* One per line: a narrow column stays clear of the centred bottom bar. */}
        <span className="block text-xs leading-5 text-muted">
          <span className="block">{t("CPU {ms} ms", { ms: stats.cpuMs.toFixed(1) })}</span>
          <span className="block">{tn(stats.drawCalls, "{n} draw call", "{n} draw calls")}</span>
          <span className="block">{tn(stats.objects, "{n} object", "{n} objects")}</span>
        </span>
      </span>
    </div>
  )
}
