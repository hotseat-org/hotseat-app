import { useEffect, useState } from "react"
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import { PANEL, PANEL_HOVER, type ShellMember } from "./shell-ui"
import { useEditorStore } from "~/editor"
import { useHeadline } from "~/office/headline/useHeadline"
import { useOfficeStore } from "~/office/store"
import { useI18n } from "~/i18n/I18nProvider"
import { addDays } from "~/utils/booking"

/**
 * How far the 3D picture's centre moves right (px) for the column: the office
 * sits in the space beside it (see ViewShift).
 */
export const HEADLINE_SCENE_SHIFT = 320

const STEP =
  "pointer-events-auto grid size-11 place-items-center rounded-full border-2 border-foreground text-foreground outline-none transition-colors hover:bg-foreground hover:text-background focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-foreground"

/** Whether an event started on the 3D office (a drag, a zoom, a click on a desk). */
const isOnScene = (event: Event) => event.target instanceof HTMLCanvasElement

/**
 * Folds the headline away the moment you move the office or click in it, so
 * it never covers what you're looking at; it stays folded until you open it.
 */
const useFoldOnSceneUse = () => {
  const [isFolded, setFolded] = useState(false)

  useEffect(() => {
    const fold = (event: Event) => {
      if (isOnScene(event)) setFolded(true)
    }
    // Capture: the camera controls stop these on the canvas before they bubble.
    const options = { capture: true, passive: true }
    window.addEventListener("pointerdown", fold, options)
    window.addEventListener("wheel", fold, options)

    return () => {
      window.removeEventListener("pointerdown", fold, options)
      window.removeEventListener("wheel", fold, options)
    }
  }, [])

  return { isFolded, unfold: () => setFolded(false) }
}

/**
 * The prototype's left column: the shown day as a headline ("Monday.") and a
 * few sentences — where you sit, what's free, who's in — with the days either
 * side. Read out when the day changes. Using the office folds it into one line
 * under the switcher; opening it again frames the office beside it.
 */
export const HeadlineColumn = ({ me, members }: { me: ShellMember; members: ShellMember[] }) => {
  const { t } = useI18n()
  const headline = useHeadline(me, members)
  const day = useOfficeStore((state) => state.booking.day)
  const from = useOfficeStore((state) => state.booking.from)
  const lastDay = useOfficeStore((state) => state.booking.lastDay)
  const setDay = useOfficeStore((state) => state.setBookingDay)
  const requestFit = useEditorStore((state) => state.requestFit)
  const { isFolded, unfold } = useFoldOnSceneUse()
  if (!headline) return null

  const [yours, ...office] = headline.sentences
  const previousDay = addDays(day, -1)
  const nextDay = addDays(day, 1)

  if (isFolded)
    return (
      <button
        type="button"
        aria-expanded={false}
        aria-label={t("Show your day")}
        onClick={() => {
          unfold()
          requestFit()
        }}
        className={`${PANEL} ${PANEL_HOVER} pointer-events-auto absolute left-5 top-[84px] flex max-w-[min(620px,50vw)] items-center gap-2.5 py-2 pr-2 pl-3.5 text-left text-[15px] leading-snug font-bold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-focus`}
      >
        <span aria-live="polite">
          <b className="font-black">{headline.title}</b> {yours}{" "}
          <span className="text-muted">{office.join(" ")}</span>
        </span>
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-secondary">
          <ChevronDown className="size-4" />
        </span>
      </button>
    )

  return (
    <section
      aria-label={t("Your day")}
      className="pointer-events-none absolute left-28 top-24 w-[min(560px,40vw)] text-foreground"
    >
      <div className="flex items-center gap-4">
        <h1 className="text-[clamp(56px,6.4vw,92px)] leading-[0.95] font-black tracking-[-0.03em]">
          {headline.title}
        </h1>
        <div className="mt-3 flex gap-1.5">
          <button
            type="button"
            aria-label={t("Previous day")}
            className={STEP}
            disabled={previousDay < from}
            onClick={() => setDay(previousDay)}
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            aria-label={t("Next day")}
            className={STEP}
            disabled={nextDay > lastDay}
            onClick={() => setDay(nextDay)}
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>

      <p
        aria-live="polite"
        className="mt-5 text-[clamp(22px,2.3vw,34px)] leading-tight font-extrabold tracking-[-0.01em]"
      >
        {yours} <span className="text-muted">{office.join(" ")}</span>
      </p>
    </section>
  )
}
