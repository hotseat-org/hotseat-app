import { useState, type ReactNode } from "react"
import { ZoomOut } from "lucide-react"
import type { ShellMember } from "./shell-ui"
import type { DayStatus } from "./dayStatus"
import { DayRings, MonthCalendar } from "~/office/booking/DateStepper"
import { useOfficeStore } from "~/office/store"
import type { Day } from "~/utils/booking"
import { useEditorStore } from "~/editor"
import { useHeadline } from "~/office/headline/useHeadline"
import { useI18n } from "~/i18n/I18nProvider"

/**
 * How far the 3D picture's centre moves right (px) for the column: the office
 * sits in the space beside it (see ViewShift).
 */
export const HEADLINE_SCENE_SHIFT = 320

/** Folding and unfolding: opacity and transform only, off with reduced motion. */
const MOTION = "transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none"

/**
 * The office's left column: the shown day as a headline ("Monday.") and a few
 * sentences — where you sit, what's free, who's in — with what to do about
 * your day: your desk in large type, the one thing to do as an ink pill. The
 * day changes beside its title (‹ › and a calendar). Zooming
 * into the office shrinks it into one line under the switcher, so it never
 * covers what you look at closely; zooming back out (or tapping the line,
 * which frames the office) brings it back.
 */
export const HeadlineColumn = ({
  me,
  members,
  day,
}: {
  me: ShellMember
  members: ShellMember[]
  /** Your day: your desk, and what to do about it (the way there, finding one, the waitlist). */
  day: DayStatus
}) => {
  const { t } = useI18n()
  const isBooking = useOfficeStore((state) => state.booking.enabled)
  const setDay = useOfficeStore((state) => state.setBookingDay)
  // The month, open in the headline (or the masthead), not a popup.
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const calendar: Calendar = {
    isOpen: isCalendarOpen,
    toggle: () => setIsCalendarOpen((wasOpen) => !wasOpen),
    pick: (pickedDay) => {
      setDay(pickedDay)
      setIsCalendarOpen(false)
    },
    close: () => setIsCalendarOpen(false),
  }
  const headline = useHeadline(me, members)
  const isFolded = useEditorStore((state) => state.isZoomedIn)
  const requestFit = useEditorStore((state) => state.requestFit)
  if (!headline) return null

  const [yours, ...office] = headline.sentences

  return (
    <>
      <section
        aria-label={t("Your day")}
        inert={isFolded}
        className={`${MOTION} on-ground pointer-events-none absolute left-6 top-24 w-[min(560px,40vw)] max-[1279px]:top-[148px] origin-top-left text-foreground ${
          isFolded ? "opacity-0 [transform:translateY(-12px)_scale(0.45)]" : "[transform:none]"
        }`}
      >
        {/* The day's controls first, in a row of their own: they never move as
            the title's width changes. Then the day as the headline. */}
        {isBooking && <DayControls calendar={calendar} />}
        <h1
          key={headline.title}
          className="motion-rise mt-4 text-[clamp(56px,6.4vw,92px)] leading-[0.95] font-black tracking-[-0.03em]"
        >
          {headline.title}
        </h1>

        {/* Fixed height (three lines): a longer or shorter sentence never moves
            what's under it. The live region stays (the new day is read out). */}
        <p
          aria-live="polite"
          className="mt-5 h-[3.75em] text-[clamp(22px,2.3vw,34px)] leading-[1.25] font-extrabold tracking-[-0.01em]"
        >
          <span key={headline.sentences.join(" ")} className="motion-rise line-clamp-3">
            {yours} <span className="text-muted">{office.join(" ")}</span>
          </span>
        </p>
        <DayActions day={day} size="large" />
        {calendar.isOpen ? (
          <MonthPicker calendar={calendar} className="mt-8" />
        ) : (
          // Your desk on the day, the largest thing after the day (the mockups'
          // "D2"): last, so its coming and going moves nothing above.
          day.desk && (
            <p className="mt-10 flex items-baseline gap-4">
              <span className="text-[clamp(72px,8vw,120px)] leading-[0.85] font-black tracking-[-0.04em] text-accent">
                {day.desk.label}
              </span>
              <span className="text-[clamp(18px,1.6vw,22px)] leading-snug font-bold">
                {day.desk.isPermanent ? t("Your desk, every day.") : t("Yours for the day.")}
              </span>
            </p>
          )
        )}
      </section>

      {/* Zoomed in: the headline as a masthead in the corner — the day, your
          sentence, the one thing to do, and the way back out — on a piece of
          the ground with a clean edge, so it reads over the model. */}
      <section
        aria-label={t("Your day")}
        inert={!isFolded}
        className={`${MOTION} pointer-events-auto absolute left-5 top-[84px] w-[min(440px,calc(100vw-40px))] max-[1279px]:top-[144px] rounded-[24px] bg-(--ground-surface) px-5 pt-4 pb-4 text-foreground shadow-[0_0_0_1px_color-mix(in_oklab,var(--foreground)_12%,transparent),0_18px_40px_-24px_rgb(0_0_0/0.35)] ${
          isFolded
            ? "[transform:none]"
            : "pointer-events-none opacity-0 [transform:translateY(-8px)]"
        }`}
      >
        {isBooking && <DayControls calendar={calendar} />}
        <p
          key={headline.title}
          className="motion-rise mt-3 text-[40px] leading-[0.95] font-black tracking-[-0.035em]"
        >
          {headline.title}
        </p>
        {/* Two lines, always: the actions under it stay put. */}
        <p className="mt-2 h-[2.75em] text-lg leading-[1.375] font-extrabold">
          <span key={headline.sentences.join(" ")} className="motion-rise line-clamp-2">
            {yours} <span className="text-muted">{office.join(" ")}</span>
          </span>
        </p>
        <DayActions day={day} size="small">
          <button
            type="button"
            onClick={requestFit}
            aria-label={t("Show your day, zoomed out to the whole office")}
            className="flex min-h-11 items-center gap-1.5 text-base font-extrabold underline decoration-2 underline-offset-[5px] outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <ZoomOut aria-hidden className="size-4" strokeWidth={2.4} />
            {t("Whole office")}
          </button>
        </DayActions>
        {calendar.isOpen && <MonthPicker calendar={calendar} className="mt-4" />}
      </section>
    </>
  )
}

/** The month calendar's state, shared by the headline and the masthead. */
interface Calendar {
  isOpen: boolean
  toggle: () => void
  pick: (day: Day) => void
  close: () => void
}

/**
 * The day's controls, a row of their own above its title: ‹ › and the
 * calendar ring, then the date in words. Nothing in it moves as days change
 * (the date comes last).
 */
const DayControls = ({ calendar }: { calendar: Calendar }) => {
  const { format } = useI18n()
  const day = useOfficeStore((state) => state.booking.day)

  return (
    <div className="pointer-events-auto flex items-center gap-4">
      <DayRings isCalendarOpen={calendar.isOpen} onCalendarToggle={calendar.toggle} />
      <span className="text-lg font-extrabold whitespace-nowrap text-muted tabular-nums">
        {format.long(day)}
      </span>
    </div>
  )
}

/** The month, to pick a day; Escape folds it away. */
const MonthPicker = ({ calendar, className }: { calendar: Calendar; className: string }) => (
  <div
    className={`motion-rise pointer-events-auto ${className}`}
    onKeyDown={(event) => {
      if (event.key === "Escape") calendar.close()
    }}
  >
    <MonthCalendar className="w-[min(420px,100%)]" onPick={calendar.pick} />
  </div>
)

/**
 * What to do about your day: the one main action as the pill, then the
 * words. The pill's place is kept (a fixed least width, and held empty when
 * there's nothing to do), so the words beside it never move between days.
 */
const DayActions = ({
  day,
  size,
  children,
}: {
  day: DayStatus
  size: "large" | "small"
  /** More words after (the masthead's way back out). */
  children?: ReactNode
}) => {
  const isLarge = size === "large"
  const pill = isLarge ? "h-14 min-w-52 px-7 text-lg" : "h-11 min-w-40 px-5 text-base"

  return (
    <p
      className={`pointer-events-auto flex flex-wrap items-center ${isLarge ? "mt-7 gap-x-7 gap-y-3" : "mt-3 gap-x-5 gap-y-2"}`}
    >
      {day.primary ? (
        <button
          type="button"
          onClick={day.primary.onPress}
          className={`${pill} rounded-full bg-pill font-black text-pill-foreground transition-opacity outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-focus`}
        >
          {day.primary.label}
        </button>
      ) : (
        <span aria-hidden className={`${pill} invisible`} />
      )}
      {isLarge && (
        <button
          type="button"
          onClick={day.bookings.onPress}
          className="min-h-11 text-lg font-extrabold underline decoration-2 underline-offset-[5px] outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          {day.bookings.label}
        </button>
      )}
      {children}
    </p>
  )
}
