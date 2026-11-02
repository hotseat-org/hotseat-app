import clsx from "clsx"
import { ChevronLeft, Pencil, Pin } from "lucide-react"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { deskName, useDeskFloor } from "../booking/useBooking"
import { personByEmail, usePeople } from "../desks/people"
import { useOfficeStore } from "../store"
import { isPerfect, type MatchDesk, type SeatMatch, type SeatRule } from "./matching"
import {
  ANY_DAY,
  AddPreference,
  Checklist,
  DayChips,
  PRIMARY_BUTTON,
  RuleRows,
  SECONDARY_BUTTON,
  SECTION_TITLE,
  addRule,
  useDayLabel,
  type When,
} from "./parts"
import { useRuleText } from "./ruleText"
import { useSavedRules, useSeatMatches, useShowSeatOnMap } from "./useFindSeat"
import { BottomSheet } from "~/components/ui/BottomSheet"
import { useAllPieces } from "~/editor"
import { useI18n } from "~/i18n/I18nProvider"
import { deskState, type Day } from "~/utils/booking"

/** Alternatives offered under the desk found. */
const ALTERNATIVES = 3
/** Days "any day" lists at first, and more each time. */
const ANY_DAY_STEP = 5

type Screen = "shortcuts" | "form" | "adding" | "result" | "anyDay"

/**
 * Finding a seat on a phone, in one sheet over the office: one-tap
 * shortcuts first (your usual desk, next to a colleague, your preferences,
 * any day); "Something else…" opens the form — when, and your preferences,
 * each a must or a preference; then the desk found, shown on the map above
 * the sheet, with why it fits and Book.
 */
export const FindSeatSheet = ({
  bottomInset,
  onClose,
}: {
  /** The tab bar's height: the sheet stands above it. */
  bottomInset: number
  onClose: () => void
}) => {
  const { t } = useI18n()
  const { rules: savedRules, setRules: setSavedRules } = useSavedRules()
  const seats = useSeatMatches(savedRules)
  const shownDay = useOfficeStore((state) => state.booking.day)
  const [screen, setScreen] = useState<Screen>("shortcuts")
  const [when, setWhen] = useState<When>(() =>
    seats.dayChoices.includes(shownDay) ? shownDay : (seats.dayChoices[0] ?? ANY_DAY)
  )
  // The form's preferences, until found with; kept too, when asked to.
  const [draftRules, setDraftRules] = useState(savedRules)
  const [isRemembered, setIsRemembered] = useState(true)
  // The preferences the result was found with: saved ones, or the form's.
  const [activeRules, setActiveRules] = useState(savedRules)

  const titles: Record<Screen, string | undefined> = {
    shortcuts: t("Where to?"),
    form: t("Find me a seat"),
    adding: t("Add a preference"),
    result: undefined,
    anyDay: undefined,
  }
  const findWith = (rules: SeatRule[], target: When) => {
    setActiveRules(rules)
    setWhen(target)
    setScreen(target === ANY_DAY ? "anyDay" : "result")
  }

  return (
    <BottomSheet
      title={titles[screen]}
      label={t("Find a seat")}
      isTall={screen !== "result"}
      bottomInset={bottomInset}
      onClose={onClose}
    >
      {(close) => {
        if (screen === "form")
          return (
            <FormScreen
              days={seats.dayChoices}
              when={when}
              rules={draftRules}
              isRemembered={isRemembered}
              onWhen={setWhen}
              onRules={setDraftRules}
              onRemember={setIsRemembered}
              onAdd={() => setScreen("adding")}
              onFind={() => {
                if (isRemembered) setSavedRules(draftRules)

                findWith(draftRules, when)
              }}
            />
          )

        if (screen === "adding")
          return (
            <AddPreference
              rules={draftRules}
              onAdd={(rule) => {
                setDraftRules(addRule(draftRules, rule))
                setScreen("form")
              }}
              onBack={() => setScreen("form")}
            />
          )

        if (screen === "result" && when !== ANY_DAY)
          return (
            <ResultScreen
              day={when}
              days={seats.dayChoices}
              rules={activeRules}
              onChange={() => {
                setDraftRules(activeRules)
                setScreen("form")
              }}
              onTryAnyDay={() => findWith(activeRules, ANY_DAY)}
              onBooked={close}
            />
          )

        if (screen === "anyDay")
          return (
            <AnyDayScreen
              rules={activeRules}
              onBack={() => setScreen("shortcuts")}
              onBooked={close}
            />
          )

        return (
          <ShortcutsScreen
            days={seats.dayChoices}
            when={when}
            rules={savedRules}
            onWhen={(next) => (next === ANY_DAY ? findWith(savedRules, ANY_DAY) : setWhen(next))}
            onFind={(rules) => findWith(rules, when)}
            onFindAnyDay={() => findWith(savedRules, ANY_DAY)}
            onSomethingElse={() => {
              setDraftRules(savedRules)
              setScreen("form")
            }}
            onClose={close}
          />
        )
      }}
    </BottomSheet>
  )
}

const CARD_SHAPE = "flex flex-col gap-2.5 rounded-[18px] p-4"
const CARD = `${CARD_SHAPE} bg-surface shadow-surface`

/** A shortcut's button: Book (filled) or Find (soft). */
const ShortcutButton = ({
  isBook,
  isDisabled = false,
  onPress,
  children,
}: {
  isBook: boolean
  isDisabled?: boolean
  onPress: () => void
  children: ReactNode
}) => (
  <button
    type="button"
    onClick={onPress}
    disabled={isDisabled}
    className={clsx(
      "min-h-11 shrink-0 rounded-full px-4 text-[15px] font-black outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50",
      isBook ? "bg-accent text-accent-foreground" : "bg-accent/15 text-accent"
    )}
  >
    {children}
  </button>
)

/** The shortcuts: the day, then one card per way of asking. */
const ShortcutsScreen = ({
  days,
  when,
  rules,
  onWhen,
  onFind,
  onFindAnyDay,
  onSomethingElse,
  onClose,
}: {
  days: Day[]
  when: When
  rules: SeatRule[]
  onWhen: (when: When) => void
  onFind: (rules: SeatRule[]) => void
  onFindAnyDay: () => void
  onSomethingElse: () => void
  onClose: () => void
}) => {
  const i18n = useI18n()
  const { t, format } = i18n
  const { describe } = useRuleText()
  const people = usePeople()
  const pieces = useAllPieces()
  const bookings = useOfficeStore((state) => state.booking.byDay)
  const released = useOfficeStore((state) => state.booking.released)
  const usual = useOfficeStore((state) => state.booking.preferences.usual)
  const favorites = useOfficeStore((state) => state.booking.preferences.favorites)
  const reserve = useOfficeStore((state) => state.booking.reserve)
  const isPending = useOfficeStore((state) => state.booking.pending)
  const showSeatOnMap = useShowSeatOnMap()
  const seats = useSeatMatches(rules)
  const day = when === ANY_DAY ? (days[0] ?? null) : when
  const dayResult = useMemo(() => (day ? seats.onDay(day) : null), [seats, day])
  const onDay = day ? format.onDay(day) : ""

  const book = (desk: MatchDesk) => {
    if (!day) return

    reserve([{ deskId: desk.id, dates: [day] }])
    showSeatOnMap(desk.id, day)
    onClose()
  }

  // Your usual desk (or first favourite), and whether it's free that day.
  const usualId = usual?.deskId ?? favorites[0]
  const usualDesk = pieces.find((piece) => piece.id === usualId)
  const isUsualFree =
    !!usualDesk && !!day && deskState(usualDesk, day, bookings, released).kind === "free"

  // The first colleague you'd sit near: where they are, and the desk free beside them.
  const colleagueRule = rules.find(
    (rule): rule is Extract<SeatRule, { kind: "colleague" }> =>
      rule.kind === "colleague" && rule.strength !== "avoid"
  )
  const colleagueName = colleagueRule
    ? (personByEmail(people, colleagueRule.email)?.name ?? colleagueRule.email)
    : ""
  const colleagueSeats = useSeatMatches(
    useMemo(
      () => (colleagueRule ? [{ ...colleagueRule, strength: "must" as const }] : []),
      [colleagueRule]
    )
  )
  const besideColleague = day && colleagueRule ? colleagueSeats.onDay(day)?.matches[0] : undefined
  const best = dayResult?.matches[0]

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <DayChips days={days} value={when} onChange={onWhen} isDark />
        </div>
        <button
          type="button"
          onClick={() => onWhen(ANY_DAY)}
          className="min-h-10 shrink-0 rounded-full border border-border bg-surface px-3.5 text-sm font-bold"
        >
          {t("Any day")}
        </button>
      </div>

      {seats.isResident && (
        <p className="flex items-center gap-2 rounded-2xl bg-surface-secondary px-4 py-3 text-sm font-bold">
          <Pin className="size-4 shrink-0 text-accent" />
          {t("You have a permanent desk here: it's yours every day.")}
        </p>
      )}

      {!seats.isResident && dayResult?.current && day && (
        <div className={clsx(CARD, "flex-row items-center")}>
          <span className="min-w-0 flex-1 text-sm font-bold">
            {t("You're at {desk} that day.", { desk: deskName(i18n, dayResult.current) })}
          </span>
          <ShortcutButton
            isBook={false}
            onPress={() => {
              showSeatOnMap(dayResult.current!.id, day)
              onClose()
            }}
          >
            {t("Show")}
          </ShortcutButton>
        </div>
      )}

      {!seats.isResident && !dayResult?.current && (
        <>
          {usualDesk && (
            <div className={CARD}>
              <div className="flex items-center gap-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-[17px] font-black">{t("My usual")}</span>
                  <span className="block text-[13px] text-muted">
                    {isUsualFree
                      ? t("{desk} is free {day}", { desk: deskName(i18n, usualDesk), day: onDay })
                      : t("{desk} is taken {day}", { desk: deskName(i18n, usualDesk), day: onDay })}
                  </span>
                </span>
                {isUsualFree ? (
                  <ShortcutButton isBook isDisabled={isPending} onPress={() => book(usualDesk)}>
                    {t("Book")}
                  </ShortcutButton>
                ) : (
                  <ShortcutButton
                    isBook={false}
                    onPress={() => onFind(addRule(rules, { kind: "favorite", strength: "prefer" }))}
                  >
                    {t("Find")}
                  </ShortcutButton>
                )}
              </div>
            </div>
          )}

          {colleagueRule && (
            <div className={CARD}>
              <div className="flex items-center gap-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-[17px] font-black">
                    {t("Next to {name}", { name: colleagueName })}
                  </span>
                  <span className="block text-[13px] text-muted">
                    {besideColleague
                      ? t("{desk} is free beside them {day}", {
                          desk: deskName(i18n, besideColleague.desk),
                          day: onDay,
                        })
                      : t("Nothing free beside them {day}", { day: onDay })}
                  </span>
                </span>
                {besideColleague && (
                  <ShortcutButton
                    isBook
                    isDisabled={isPending}
                    onPress={() => book(besideColleague.desk)}
                  >
                    {t("Book")}
                  </ShortcutButton>
                )}
              </div>
            </div>
          )}

          <div className={CARD}>
            <div className="flex items-center gap-3">
              <span className="min-w-0 flex-1">
                <span className="block text-[17px] font-black">{t("Your preferences")}</span>
                <span className="block text-[13px] text-muted">
                  {best
                    ? t("{desk} fits {day}", { desk: deskName(i18n, best.desk), day: onDay })
                    : t("Nothing fits {day}", { day: onDay })}
                </span>
              </span>
              <ShortcutButton isBook={false} onPress={() => onFind(rules)}>
                {t("Find")}
              </ShortcutButton>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {rules.length === 0 && <Tag>{t("Any free desk")}</Tag>}
              {rules.map((rule, index) => (
                <Tag key={index}>{describe(rule)}</Tag>
              ))}
            </div>
          </div>

          <div className={clsx(CARD_SHAPE, "bg-foreground text-background")}>
            <div className="flex items-center gap-3">
              <span className="min-w-0 flex-1">
                <span className="block text-[17px] font-black">{t("Any day")}</span>
                <span className="block text-[13px] opacity-80">{t("I don't mind when")}</span>
              </span>
              <button
                type="button"
                onClick={onFindAnyDay}
                className="min-h-11 shrink-0 rounded-full bg-background px-4 text-[15px] font-black text-foreground outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                {t("Find")}
              </button>
            </div>
          </div>
        </>
      )}

      <div className="mt-1 flex gap-2.5">
        <button
          type="button"
          onClick={onSomethingElse}
          className="min-h-[52px] flex-1 rounded-full border-[1.5px] border-accent text-[15px] font-black text-accent outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          {t("Something else…")}
        </button>
        <button
          type="button"
          aria-label={t("Edit preferences")}
          onClick={onSomethingElse}
          className="grid size-[52px] shrink-0 place-items-center rounded-full border border-border bg-surface outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <Pencil className="size-5" />
        </button>
      </div>
    </div>
  )
}

const Tag = ({ children }: { children: ReactNode }) => (
  <span className="inline-flex h-6 items-center rounded-full bg-surface-tertiary px-2.5 text-xs font-bold text-foreground">
    {children}
  </span>
)

/** The form: when, and your preferences — then find with them. */
const FormScreen = ({
  days,
  when,
  rules,
  isRemembered,
  onWhen,
  onRules,
  onRemember,
  onAdd,
  onFind,
}: {
  days: Day[]
  when: When
  rules: SeatRule[]
  isRemembered: boolean
  onWhen: (when: When) => void
  onRules: (rules: SeatRule[]) => void
  onRemember: (isRemembered: boolean) => void
  onAdd: () => void
  onFind: () => void
}) => {
  const { t, format } = useI18n()
  const today = useOfficeStore((state) => state.booking.today)
  const isAnyDay = when === ANY_DAY
  const getFindLabel = () => {
    if (when === ANY_DAY) return t("Find a seat on any day")
    if (when === today) return t("Find a seat for today")
    if (days[0] === today && when === days[1]) return t("Find a seat for tomorrow")

    return t("Find a seat {day}", { day: format.onDay(when) })
  }

  return (
    <div className="flex min-h-full flex-col">
      <section>
        <h3 className={clsx(SECTION_TITLE, "mb-2.5")}>{t("When")}</h3>
        <DayChips days={days} value={when} onChange={onWhen} isWrapping />
        <label className="mt-3 flex items-center gap-3 rounded-2xl bg-surface-secondary px-3.5 py-3">
          <span className="flex-1">
            <span className="block text-[15px] font-extrabold">{t("I don't mind when")}</span>
            <span className="block text-[13px] text-muted">
              {t("The first day a desk that fits is free")}
            </span>
          </span>
          <input
            type="checkbox"
            checked={isAnyDay}
            onChange={(event) =>
              onWhen(event.currentTarget.checked ? ANY_DAY : (days[0] ?? ANY_DAY))
            }
            className="size-[22px] accent-[var(--accent)]"
          />
        </label>
      </section>

      <section className="mt-5">
        <div className="flex items-baseline justify-between">
          <h3 className={SECTION_TITLE}>{t("Preferences")}</h3>
          <span className="text-xs text-muted">{t("Must · Prefer")}</span>
        </div>
        <RuleRows rules={rules} onChange={onRules} onAdd={onAdd} />
      </section>

      <div className="sticky bottom-0 mt-auto flex flex-col gap-2 border-t border-border bg-overlay pt-3">
        <label className="flex items-center gap-2.5 text-sm font-bold">
          <input
            type="checkbox"
            checked={isRemembered}
            onChange={(event) => onRemember(event.currentTarget.checked)}
            className="size-5 accent-[var(--accent)]"
          />
          {t("Remember these preferences")}
        </label>
        <button
          type="button"
          onClick={onFind}
          className={clsx(PRIMARY_BUTTON, "min-h-14 text-[17px]")}
        >
          {getFindLabel()}
        </button>
      </div>
    </div>
  )
}

/**
 * The desk found for a day — spotlit on the map above the sheet — with why it
 * fits, others that do, and Book.
 */
const ResultScreen = ({
  day,
  days,
  rules,
  onChange,
  onTryAnyDay,
  onBooked,
}: {
  day: Day
  days: Day[]
  rules: SeatRule[]
  onChange: () => void
  onTryAnyDay: () => void
  onBooked: () => void
}) => {
  const i18n = useI18n()
  const { t, format } = i18n
  const dayLabel = useDayLabel()
  const getDeskFloor = useDeskFloor()
  const seats = useSeatMatches(rules)
  const reserve = useOfficeStore((state) => state.booking.reserve)
  const isPending = useOfficeStore((state) => state.booking.pending)
  const showSeatOnMap = useShowSeatOnMap()
  const [pickedDeskId, setPickedDeskId] = useState<string | null>(null)
  const matches = useMemo(() => seats.onDay(day)?.matches ?? [], [seats, day])
  const best = matches.find((match) => match.desk.id === pickedDeskId) ?? matches[0]
  const alternatives = matches.filter((match) => match !== best).slice(0, ALTERNATIVES)

  // Shown on the map above the sheet as it's found (or picked).
  const bestId = best?.desk.id
  useEffect(() => {
    if (bestId) showSeatOnMap(bestId, day)
  }, [bestId, day, showSeatOnMap])

  const when = day === days[0] || day === days[1] ? `${dayLabel(day, days)} · ` : ""

  if (!best)
    return (
      <div className="flex flex-col items-start gap-3 pt-6">
        <p className="text-lg font-black">{t("Nothing fits that day.")}</p>
        <div className="flex gap-2">
          <button type="button" onClick={onChange} className={SECONDARY_BUTTON}>
            {t("Change")}
          </button>
          <button type="button" onClick={onTryAnyDay} className={PRIMARY_BUTTON}>
            {t("Try any day")}
          </button>
        </div>
      </div>
    )

  return (
    <div className="flex flex-col pt-4">
      <p className="text-[13px] font-extrabold text-muted">
        {when}
        {format.long(day)}
      </p>
      <h3 className="text-[28px] font-black leading-tight">{deskName(i18n, best.desk)}</h3>
      <p className="text-sm text-muted">
        {[best.desk.zone, getDeskFloor(best.desk)].filter(Boolean).join(" · ")}
      </p>

      {best.met.length + best.missed.length > 0 && (
        <div className="mt-3.5 rounded-2xl bg-surface-secondary px-3.5 py-2">
          <Checklist match={best} />
        </div>
      )}

      {alternatives.length > 0 && (
        <>
          <p className="mb-2 mt-4 text-[13px] font-extrabold text-muted">{t("Or")}</p>
          <div className="-mx-5 flex gap-2.5 overflow-x-auto px-5 pb-1">
            {alternatives.map((match) => (
              <AlternativeCard
                key={match.desk.id}
                match={match}
                rulesCount={rules.length}
                onPress={() => setPickedDeskId(match.desk.id)}
              />
            ))}
          </div>
        </>
      )}

      <div className="mt-5 flex gap-2.5">
        <button type="button" onClick={onChange} className={clsx(SECONDARY_BUTTON, "min-h-14")}>
          {t("Change")}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            reserve([{ deskId: best.desk.id, dates: [day] }])
            onBooked()
          }}
          className={clsx(PRIMARY_BUTTON, "min-h-14 flex-1 text-[17px]")}
        >
          {t("Book {desk}", { desk: deskName(i18n, best.desk) })}
        </button>
      </div>
    </div>
  )
}

const AlternativeCard = ({
  match,
  rulesCount,
  onPress,
}: {
  match: SeatMatch
  rulesCount: number
  onPress: () => void
}) => {
  const i18n = useI18n()
  const { t } = i18n

  return (
    <button
      type="button"
      onClick={onPress}
      className="w-[150px] shrink-0 rounded-2xl border border-border bg-surface p-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-focus"
    >
      <span className="block text-[15px] font-black">{deskName(i18n, match.desk)}</span>
      <span className="block truncate text-xs text-muted">
        {[
          match.desk.zone,
          isPerfect(match)
            ? null
            : t("{met} of {total}", { met: match.met.length, total: rulesCount }),
        ]
          .filter(Boolean)
          .join(" · ")}
      </span>
    </button>
  )
}

/** "I don't mind when": the first days with a desk that fits, each bookable at once. */
const AnyDayScreen = ({
  rules,
  onBack,
  onBooked,
}: {
  rules: SeatRule[]
  onBack: () => void
  onBooked: () => void
}) => {
  const i18n = useI18n()
  const { t, format } = i18n
  const { describe } = useRuleText()
  const seats = useSeatMatches(rules)
  const reserve = useOfficeStore((state) => state.booking.reserve)
  const isPending = useOfficeStore((state) => state.booking.pending)
  const showSeatOnMap = useShowSeatOnMap()
  const [limit, setLimit] = useState(ANY_DAY_STEP)
  const days = useMemo(() => seats.anyDay(limit + 1), [seats, limit])
  const shown = days.slice(0, limit)

  return (
    <div className="flex flex-col pt-3">
      <button
        type="button"
        onClick={onBack}
        className="-ml-2 flex min-h-11 items-center gap-1 self-start rounded-full pr-3 text-sm font-extrabold text-accent outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        <ChevronLeft className="size-5" />
        {t("Back")}
      </button>
      <h3 className="text-xl font-black">{t("The first days that fit")}</h3>
      <p className="mb-3.5 text-[13px] text-muted">
        {rules.length ? rules.map(describe).join(" · ") : t("Any free desk")}
      </p>

      {shown.length === 0 && (
        <p className="rounded-2xl bg-surface-secondary px-4 py-3 text-sm font-bold">
          {t("No day fits while desks can be booked.")}
        </p>
      )}
      <ul className="flex flex-col gap-2.5">
        {shown.map(({ day, matches }) => {
          const best = matches[0]
          const isAll = isPerfect(best)

          return (
            <li
              key={day}
              className="flex items-center gap-3.5 rounded-[18px] bg-surface px-4 py-3.5 shadow-surface"
            >
              <span className="w-12 shrink-0 text-center">
                <span className="block text-xs font-extrabold uppercase text-muted">
                  {format.dow(day)}
                </span>
                <span className="block text-2xl font-black leading-tight">
                  {Number(day.slice(8, 10))}
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-black">
                  {deskName(i18n, best.desk)}
                </span>
                <span className={clsx("block text-xs font-extrabold", !isAll && "text-muted")}>
                  {isAll
                    ? t("Everything you asked for")
                    : t("{met} of {total}", { met: best.met.length, total: rules.length })}
                </span>
              </span>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  reserve([{ deskId: best.desk.id, dates: [day] }])
                  showSeatOnMap(best.desk.id, day)
                  onBooked()
                }}
                className={clsx(
                  "min-h-11 shrink-0 rounded-full px-4 text-[15px] font-black outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50",
                  isAll ? "bg-accent text-accent-foreground" : "bg-accent/15 text-accent"
                )}
              >
                {t("Book")}
              </button>
            </li>
          )
        })}
      </ul>
      {days.length > limit && (
        <button
          type="button"
          onClick={() => setLimit(limit + ANY_DAY_STEP)}
          className="mt-1 min-h-11 text-[15px] font-extrabold text-accent"
        >
          {t("Show later days")}
        </button>
      )}
    </div>
  )
}
