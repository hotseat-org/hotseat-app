import { ChevronLeft, ChevronRight } from "lucide-react"
import type { ShellMember } from "./shell-ui"
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

/**
 * The prototype's left column: the shown day as a headline ("Monday.") and a
 * few sentences — where you sit, what's free, who's in — with the days either
 * side. Read out when the day changes.
 */
export const HeadlineColumn = ({ me, members }: { me: ShellMember; members: ShellMember[] }) => {
  const { t } = useI18n()
  const headline = useHeadline(me, members)
  const day = useOfficeStore((state) => state.booking.day)
  const from = useOfficeStore((state) => state.booking.from)
  const lastDay = useOfficeStore((state) => state.booking.lastDay)
  const setDay = useOfficeStore((state) => state.setBookingDay)
  if (!headline) return null

  const [yours, ...office] = headline.sentences
  const previousDay = addDays(day, -1)
  const nextDay = addDays(day, 1)

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
