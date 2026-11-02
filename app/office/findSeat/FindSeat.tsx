import clsx from "clsx"
import { Check, Minus, Pencil, Pin, Star } from "lucide-react"
import { useMemo, useState, type ReactNode } from "react"
import { deskName, useDeskFloor } from "../booking/useBooking"
import { useOfficeStore } from "../store"
import { useTeamDays } from "../teams"
import { isPerfect, type MatchDesk, type SeatMatch, type SeatRule } from "./matching"
import { Preferences } from "./Preferences"
import { useRuleText } from "./ruleText"
import { SeatSentence } from "./SeatSentence"
import { useSavedRules, useSeatMatches } from "./useFindSeat"
import { BookingRow, deskText } from "~/components/office/BookingRow"
import { TeamDot } from "~/components/teams/teamLook"
import { useI18n } from "~/i18n/I18nProvider"
import type { Day } from "~/utils/booking"

/** Other desks that fit, offered under the best one. */
const ALTERNATIVES = 3

/** "Any day" instead of a day. */
const ANY_DAY = "any"

type When = Day | typeof ANY_DAY

type View =
  | { kind: "find" }
  | { kind: "preferences" }
  | { kind: "booked"; desk: MatchDesk; day: Day }

const CHIP =
  "min-h-11 shrink-0 rounded-full border px-4 text-sm font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus"
const PRIMARY =
  "min-h-12 rounded-full bg-accent px-5 text-[15px] font-black text-accent-foreground outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50"
const SECONDARY =
  "min-h-12 rounded-full border border-border bg-surface px-5 text-[15px] font-extrabold text-foreground outline-none hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-focus"

/** Stacked in one column (a phone's sheet), or the search beside its result (a dialog). */
export type FindSeatLayout = "stacked" | "columns"

/**
 * Finding a seat by what you'd like: pick a day (or any day), and the desk
 * that fits best is there — why it fits, others that do, one tap to book.
 * Your preferences (a zone, a colleague, a favourite, what the desk has),
 * each a must or a preference, are kept for next time; the search reads as
 * a sentence ("A seat today in Marketing, ideally near Anna").
 */
export const FindSeat = ({
  onShowOnMap,
  layout = "stacked",
}: {
  /** Show a desk on the map, on its day (a phone's sheet closes for it). */
  onShowOnMap: (deskId: string, day: Day) => void
  layout?: FindSeatLayout
}) => {
  const { rules, setRules } = useSavedRules()
  const [view, setView] = useState<View>({ kind: "find" })

  if (view.kind === "preferences")
    return (
      // A screen of its own; in a wide dialog, as narrow as on a phone.
      <div className={clsx(layout === "columns" && "mx-auto w-full max-w-md")}>
        <Preferences rules={rules} onChange={setRules} onDone={() => setView({ kind: "find" })} />
      </div>
    )

  const booked =
    view.kind === "booked" ? (
      <Booked
        desk={view.desk}
        day={view.day}
        onShowOnMap={() => onShowOnMap(view.desk.id, view.day)}
        onDone={() => setView({ kind: "find" })}
      />
    ) : null

  if (booked && layout === "stacked") return booked

  return (
    <Finder
      layout={layout}
      rules={rules}
      booked={booked}
      onEditPreferences={() => setView({ kind: "preferences" })}
      onBooked={(desk, day) => setView({ kind: "booked", desk, day })}
      onShowOnMap={onShowOnMap}
    />
  )
}

const Finder = ({
  layout,
  rules,
  booked,
  onEditPreferences,
  onBooked,
  onShowOnMap,
}: {
  layout: FindSeatLayout
  rules: SeatRule[]
  /** Booked just now: shown in place of the result (beside the search). */
  booked: ReactNode
  onEditPreferences: () => void
  onBooked: (desk: MatchDesk, day: Day) => void
  onShowOnMap: (deskId: string, day: Day) => void
}) => {
  const i18n = useI18n()
  const { t, format } = i18n
  const today = useOfficeStore((state) => state.booking.today)
  const shownDay = useOfficeStore((state) => state.booking.day)
  const reserve = useOfficeStore((state) => state.booking.reserve)
  const isPending = useOfficeStore((state) => state.booking.pending)
  const favorites = useOfficeStore((state) => state.booking.preferences.favorites)
  const seats = useSeatMatches(rules)
  const getDeskFloor = useDeskFloor()
  const getTeamsIn = useTeamDays()

  // The day picked; till then the day shown on the map, if it's one to pick,
  // else the first that is (worked out as the days come in: opened by a
  // link, they're not there yet).
  const [pickedWhen, setWhen] = useState<When | null>(null)
  const when =
    pickedWhen ??
    (seats.dayChoices.includes(shownDay) ? shownDay : (seats.dayChoices[0] ?? ANY_DAY))
  const [pickedDeskId, setPickedDeskId] = useState<string | null>(null)
  const dayResult = useMemo(() => (when === ANY_DAY ? null : seats.onDay(when)), [seats, when])
  const anyDays = useMemo(() => (when === ANY_DAY ? seats.anyDay() : []), [seats, when])

  const dayLabel = (day: Day) => {
    if (day === today) return t("Today")
    if (day === seats.dayChoices[1] && seats.dayChoices[0] === today) return t("Tomorrow")

    return format.short(day)
  }
  const describeDesk = (desk: MatchDesk) =>
    [deskName(i18n, desk), getDeskFloor(desk), desk.zone].filter(Boolean).join(" · ")
  const book = (desk: MatchDesk, day: Day) => {
    reserve([{ deskId: desk.id, dates: [day] }])
    onBooked(desk, day)
  }

  if (seats.isResident)
    return (
      <p className="flex items-center gap-2 rounded-2xl bg-surface-secondary px-4 py-3 text-sm">
        <Pin className="size-4 shrink-0 text-accent" />
        {t("You have a permanent desk here: it's yours every day.")}
      </p>
    )

  const matches = dayResult?.matches ?? []
  const best = matches.find((match) => match.desk.id === pickedDeskId) ?? matches[0]
  const alternatives = matches.filter((match) => match !== best).slice(0, ALTERNATIVES)
  // Your favourite, free that day, when the best desk isn't one.
  const favorite =
    best && !favorites.includes(best.desk.id)
      ? matches.find((match) => favorites.includes(match.desk.id))
      : undefined

  const sentence = (
    <SeatSentence
      rules={rules}
      day={when === ANY_DAY ? null : when}
      dayChoices={seats.dayChoices}
    />
  )

  const dayChips = (
    <div className="flex flex-wrap gap-2" role="group" aria-label={t("Day")}>
      {[...seats.dayChoices, ANY_DAY].map((choice) => (
        <button
          key={choice}
          type="button"
          aria-pressed={when === choice}
          onClick={() => {
            setWhen(choice)
            setPickedDeskId(null)
          }}
          className={clsx(
            CHIP,
            when === choice
              ? "border-foreground bg-foreground text-background"
              : "border-border bg-surface text-foreground hover:border-muted"
          )}
        >
          {/* Your team's days: its dot. */}
          {choice !== ANY_DAY &&
            getTeamsIn(choice).map((team) => (
              <TeamDot key={team.id} color={team.color} className="mr-1.5 size-2 align-middle" />
            ))}
          {choice === ANY_DAY ? t("Any day") : dayLabel(choice)}
        </button>
      ))}
    </div>
  )

  const result = (
    <>
      {when !== ANY_DAY && dayResult?.current && (
        <YourBooking
          desk={dayResult.current}
          day={when}
          onShowOnMap={() => onShowOnMap(dayResult.current!.id, when)}
        />
      )}

      {when !== ANY_DAY && !dayResult?.current && !best && (
        <div className="flex flex-col items-start gap-3 rounded-2xl bg-surface-secondary px-4 py-4">
          <p className="text-sm font-bold">{t("Nothing fits that day.")}</p>
          <button type="button" onClick={() => setWhen(ANY_DAY)} className={SECONDARY}>
            {t("Try any day")}
          </button>
        </div>
      )}

      {best && when !== ANY_DAY && (
        <BestMatch
          match={best}
          title={describeDesk(best.desk)}
          isPending={isPending}
          onBook={() => book(best.desk, when)}
          onShowOnMap={() => onShowOnMap(best.desk.id, when)}
        />
      )}

      {favorite && when !== ANY_DAY && (
        <div className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3">
          <Star className="size-4 shrink-0 text-warning" />
          <span className="min-w-0 flex-1 truncate text-sm font-bold">
            {t("Your preferred seat {desk} is free", { desk: deskName(i18n, favorite.desk) })}
          </span>
          <button
            type="button"
            onClick={() => setPickedDeskId(favorite.desk.id)}
            className="min-h-11 shrink-0 rounded-full px-3 text-sm font-extrabold text-accent"
          >
            {t("Pick")}
          </button>
        </div>
      )}

      {alternatives.length > 0 && when !== ANY_DAY && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-extrabold text-muted">{t("Also fits")}</p>
          <div className="flex flex-wrap gap-2">
            {alternatives.map((match) => (
              <button
                key={match.desk.id}
                type="button"
                onClick={() => setPickedDeskId(match.desk.id)}
                className={clsx(CHIP, "border-border bg-surface hover:border-muted")}
              >
                {deskName(i18n, match.desk)}
                {!isPerfect(match) && (
                  <span className="ml-1.5 text-xs font-bold text-muted">
                    {t("{met} of {total}", { met: match.met.length, total: rules.length })}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {when === ANY_DAY && (
        <AnyDayList
          days={anyDays}
          rulesCount={rules.length}
          isPending={isPending}
          describeDesk={describeDesk}
          onBook={book}
        />
      )}
    </>
  )

  // The search said as a sentence: tapped, your preferences open (their own screen).
  const sentenceButton = (
    <button
      type="button"
      onClick={onEditPreferences}
      className="flex flex-col gap-1 rounded-2xl bg-surface-secondary px-4 pt-3 pb-2 text-left outline-none hover:bg-surface-tertiary focus-visible:ring-2 focus-visible:ring-focus"
    >
      {/* Tall lines: pills on two lines don't touch. */}
      <span className="text-[15px] font-extrabold leading-[2.25]">{sentence}</span>
      <span className="flex min-h-9 items-center gap-1.5 self-end text-sm font-extrabold text-accent">
        <Pencil className="size-3.5" strokeWidth={2.6} />
        {t("Change")}
      </span>
    </button>
  )

  if (layout === "columns")
    return (
      <div className="grid min-h-full grid-cols-1 gap-6 md:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-4">
          {dayChips}
          {sentenceButton}
        </div>
        <div className="flex min-w-0 flex-col gap-4">{booked ?? result}</div>
      </div>
    )

  return (
    <div className="flex flex-col gap-4">
      {dayChips}
      {sentenceButton}
      {result}
    </div>
  )
}

const BestMatch = ({
  match,
  title,
  isPending,
  onBook,
  onShowOnMap,
}: {
  match: SeatMatch
  title: string
  isPending: boolean
  onBook: () => void
  onShowOnMap: () => void
}) => {
  const { t } = useI18n()
  const { describeOutcome } = useRuleText()

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-surface">
      <div>
        <p className="text-xs font-extrabold text-muted">
          {isPerfect(match) ? t("Best match") : t("Closest match")}
        </p>
        <p className="text-xl font-black">{title}</p>
      </div>
      {match.met.length + match.missed.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {match.met.map((rule, index) => (
            <li key={`met-${index}`} className="flex items-center gap-2.5 text-sm font-bold">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-success text-success-foreground">
                <Check className="size-3" strokeWidth={3.4} />
              </span>
              {describeOutcome(rule, true, match.teammates)}
            </li>
          ))}
          {match.missed.map((rule, index) => (
            <li
              key={`missed-${index}`}
              className="flex items-center gap-2.5 text-sm font-bold text-muted"
            >
              <span className="grid size-5 shrink-0 place-items-center rounded-full border-2 border-muted/60">
                <Minus className="size-3" strokeWidth={3.4} />
              </span>
              {describeOutcome(rule, false)}
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <button type="button" onClick={onShowOnMap} className={SECONDARY}>
          {t("Show on map")}
        </button>
        <button
          type="button"
          onClick={onBook}
          disabled={isPending}
          className={clsx(PRIMARY, "flex-1")}
        >
          {t("Book")}
        </button>
      </div>
    </div>
  )
}

/** "I don't mind when": the first days with a desk that fits, each bookable at once. */
const AnyDayList = ({
  days,
  rulesCount,
  isPending,
  describeDesk,
  onBook,
}: {
  days: ReturnType<ReturnType<typeof useSeatMatches>["anyDay"]>
  rulesCount: number
  isPending: boolean
  describeDesk: (desk: MatchDesk) => string
  onBook: (desk: MatchDesk, day: Day) => void
}) => {
  const { t, format } = useI18n()

  if (days.length === 0)
    return (
      <p className="rounded-2xl bg-surface-secondary px-4 py-3 text-sm font-bold">
        {t("No day fits while desks can be booked.")}
      </p>
    )

  return (
    <ul className="flex flex-col gap-2">
      {days.map(({ day, matches }) => {
        const best = matches[0]

        return (
          <li
            key={day}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3"
          >
            <span className="w-14 shrink-0 text-sm font-black">{format.short(day)}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-extrabold">
                {describeDesk(best.desk)}
              </span>
              <span className="block text-xs font-bold text-muted">
                {isPerfect(best)
                  ? t("Everything you asked for")
                  : t("{met} of {total}", { met: best.met.length, total: rulesCount })}
              </span>
            </span>
            <button
              type="button"
              onClick={() => onBook(best.desk, day)}
              disabled={isPending}
              className={clsx(PRIMARY, "shrink-0 px-4")}
            >
              {t("Book")}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Your booking that day, as your bookings show it — Show, and Cancel (asked
 * once): cancelled, the day's free desks are offered again.
 */
const YourBooking = ({
  desk,
  day,
  onShowOnMap,
  onCancelled,
}: {
  desk: MatchDesk
  day: Day
  onShowOnMap: () => void
  onCancelled?: () => void
}) => {
  const i18n = useI18n()
  const { t, format } = i18n
  const getDeskFloor = useDeskFloor()
  const cancel = useOfficeStore((state) => state.booking.cancel)

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-extrabold text-muted">{t("Your booking")}</p>
      <BookingRow
        desk={deskText(i18n, desk.label, getDeskFloor(desk))}
        detail={format.long(day)}
        day={day}
        onShow={onShowOnMap}
        onCancel={() => {
          cancel([day])
          onCancelled?.()
        }}
      />
    </div>
  )
}

/** Just booked: said so, and the booking as your bookings show it (Show, Cancel). */
const Booked = ({
  desk,
  day,
  onShowOnMap,
  onDone,
}: {
  desk: MatchDesk
  day: Day
  onShowOnMap: () => void
  /** Back to finding a seat (another, or this one cancelled). */
  onDone: () => void
}) => {
  const { t, format } = useI18n()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-success text-success-foreground">
          <Check className="size-6" strokeWidth={3} />
        </span>
        <div>
          <p className="text-lg font-black">{t("Booked for you")}</p>
          <p className="text-sm text-muted">{format.long(day)}</p>
        </div>
      </div>
      <YourBooking desk={desk} day={day} onShowOnMap={onShowOnMap} onCancelled={onDone} />
      <button type="button" onClick={onDone} className={SECONDARY}>
        {t("Find another")}
      </button>
    </div>
  )
}
