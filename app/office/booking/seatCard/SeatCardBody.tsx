import clsx from "clsx"
import {
  CalendarDays,
  CalendarX,
  Check,
  ChevronLeft,
  ChevronRight,
  Footprints,
  LogOut,
  Repeat,
  Star,
  Undo2,
} from "lucide-react"
import { useLayoutEffect, useRef, useState } from "react"
import { type Person } from "../../desks/people"
import { UsualStep } from "./UsualStep"
import type { Option } from "./useSeatCard"
import { DialogCloseButton } from "~/components/ui/DialogCloseButton"
import { MemberAvatar } from "~/components/office/shell-ui"
import { useSwipeToClose } from "~/components/ui/useSwipeToClose"
import { type Day } from "~/utils/booking"
import type { Translator } from "~/i18n/translate"

export interface BodyProps {
  /** The reader's language (the 3D card renders in drei's own root: no context there). */
  i18n: Translator
  title: string
  /** What it offers ("Standing desk"). */
  features: string[]
  canFavorite: boolean
  isFavorite: boolean
  onToggleFavorite: () => void
  /**
   * Your usual desk (booked for you on chosen weekdays): null when this desk
   * can't be one for you; `weekdays` set when it already is.
   */
  usual: { weekdays: number[] | null; replaces?: string; suggested: number[] } | null
  onSetUsual: (weekdays: number[]) => void
  onClearUsual: () => void
  /** The shown day ("Wed 23 Sep"); absent without booking. */
  dayLabel?: string
  state: "resident" | "booked" | "free"
  person: Person | null
  /** Open their profile (none: the page has no profiles). */
  onShowPerson?: () => void
  mine: boolean
  past: boolean
  /** What's worth knowing about it, a sentence each (who's next to it, whose corner). */
  facts: string[]
  note?: string
  options: Option[]
  pending: boolean
  canCancel: boolean
  /** Your permanent desk: ways to give it up (one day, the rest of the week). */
  releaseChoices: { label: string; days: Day[] }[]
  /** Your permanent desk, on a day you gave up (and nobody booked): take it back. */
  canReclaim: boolean
  closing: boolean
  onClose: () => void
  onReserve: (days: Day[]) => void
  /** Open the calendar to pick any days (the "Custom…" choice). */
  onCustom: () => void
  /** Show the way here from the entrance. */
  onShowWay: () => void
  onCancel: () => void
  onRelease: (days: Day[]) => void
  onReclaim: () => void
}

const stop = (event: { stopPropagation: () => void }) => event.stopPropagation()

/** ISO weekdays (1 = Monday) as short names: "Mon, Wed". */
const weekdayNames = ({ format }: Translator, weekdays: number[]) =>
  weekdays
    .filter((weekday) => weekday <= 5)
    .map((weekday) => format.workdays()[weekday - 1])
    .join(", ")

/** The row's height: a sheet's are touch-sized, a row with a detail line grows. */
const getRowSize = (isSheet: boolean, hasDetail: boolean) => {
  if (isSheet) return "min-h-12 py-2.5"

  return hasDetail ? "min-h-11 py-1.5" : "h-10"
}

/** One of the card's actions: an icon, a label (and maybe a detail), a step on (chevron). */
const Row = ({
  icon: Icon,
  label,
  detail,
  onPress,
  isPrimary = false,
  isDanger = false,
  hasStep = false,
  isDisabled = false,
  isSheet,
  isLink = false,
}: {
  icon: typeof Check
  label: string
  detail?: string
  onPress: () => void
  isPrimary?: boolean
  isDanger?: boolean
  hasStep?: boolean
  isDisabled?: boolean
  isSheet: boolean
  /** An underlined word, not a row (the card's lesser actions beside its desk). */
  isLink?: boolean
}) =>
  isLink ? (
    // Beside the desk, the other actions are words (the headline's links).
    <button
      type="button"
      disabled={isDisabled}
      onClick={onPress}
      className={clsx(
        "min-h-10 text-left text-[15px] leading-tight font-extrabold underline decoration-2 underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50",
        isDanger ? "text-danger" : "text-foreground"
      )}
    >
      {label}
    </button>
  ) : (
    <button
      type="button"
      disabled={isDisabled}
      onClick={onPress}
      className={clsx(
        "flex w-full items-center gap-2.5 px-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50",
        getRowSize(isSheet, !!detail),
        // The one main action: the headline's ink pill; the rest, plain words.
        isPrimary
          ? "mb-1.5 rounded-full bg-foreground px-4 font-black text-background hover:opacity-90"
          : clsx(
              "rounded-xl font-extrabold hover:bg-foreground/5",
              isDanger ? "text-danger" : "text-foreground"
            )
      )}
    >
      <Icon
        className={clsx("size-4 shrink-0", !isPrimary && !isDanger && "text-accent")}
        strokeWidth={isPrimary ? 2.6 : 2}
      />
      <span className="min-w-0 flex-1">
        <span
          className={clsx("block leading-tight", isSheet ? "text-[1.05rem]" : "text-[0.95rem]")}
        >
          {label}
        </span>
        {detail && (
          <span
            className={clsx(
              "block truncate text-[0.7rem] font-semibold",
              isPrimary ? "text-background/75" : "text-muted"
            )}
          >
            {detail}
          </span>
        )}
      </span>
      {hasStep && <ChevronRight className="size-4 shrink-0 text-muted" />}
    </button>
  )

/** The desk's colour in its title: yours blue, free green, past or taken ink. */
const getTitleTone = ({
  isMine,
  isFree,
  isPast,
}: {
  isMine: boolean
  isFree: boolean
  isPast: boolean
}) => {
  if (isPast) return "text-muted"
  if (isMine) return "text-accent"

  return isFree ? "text-success" : "text-foreground"
}

/** A step's title bar: back to the card's main list. */
export const StepHeader = ({
  i18n: { t },
  title,
  onBack,
}: {
  i18n: Translator
  title: string
  onBack: () => void
}) => (
  <div className="flex items-center gap-1.5">
    <button
      type="button"
      aria-label={t("Back")}
      onClick={onBack}
      className="grid size-8 shrink-0 place-items-center rounded-full text-foreground hover:bg-foreground/5"
    >
      <ChevronLeft className="size-4" strokeWidth={2.5} />
    </button>
    <p className="text-lg leading-tight font-black tracking-[-0.01em]">{title}</p>
  </div>
)

/**
 * The card itself — plain props only (the 3D view renders it in drei's separate
 * root). Anchored over its desk, or on phones a bottom sheet (`layout="sheet"`):
 * the same content, full width, with bigger targets.
 *
 * A short list of actions: the one that matters most filled (Reserve the shown
 * day; on your own desk, the way there), the rest as labelled rows — those with
 * a chevron open their own step in the card (more days, your usual desk).
 */
export const SeatCardBody = ({
  layout = "anchored",
  i18n,
  title,
  features,
  canFavorite,
  isFavorite,
  onToggleFavorite,
  usual,
  onSetUsual,
  onClearUsual,
  dayLabel,
  state,
  person,
  onShowPerson,
  mine,
  past,
  facts,
  note,
  options,
  pending,
  canCancel,
  releaseChoices,
  canReclaim,
  closing,
  onClose,
  onReserve,
  onCustom,
  onShowWay,
  onCancel,
  onRelease,
  onReclaim,
}: BodyProps & { layout?: "anchored" | "sheet" }) => {
  const isSheet = layout === "sheet"
  const { t } = i18n
  const [step, setStep] = useState<"main" | "days" | "usual">("main")
  // The phone's sheet closes by a swipe down from its top too.
  const swipe = useSwipeToClose(onClose)

  // Above the desk by default; a desk near the top of the screen gets the card
  // below it instead, so it's never cut off. Decided once, before paint.
  const cardRef = useRef<HTMLDivElement>(null)
  const [below, setBelow] = useState(false)
  useLayoutEffect(() => {
    const top = cardRef.current?.getBoundingClientRect().top ?? 0
    // Clear of the top bar too (and its second row on narrower screens).
    const barBottom = window.innerWidth < 1280 ? 148 : 84
    if (!isSheet && top < barBottom) setBelow(true)
  }, [isSheet])

  // The shown day alone, and the longer choices (for "Book more days").
  const one = options.find((option) => option.key === "one" && option.free.length > 0)
  const more = options.filter((option) => option.key !== "one")
  const showWayFirst = mine && !one
  const shortDay = dayLabel?.split(" ").slice(0, 2).join(" ")
  const getStatus = () => {
    const dayName = dayLabel ?? ""
    if (past) return t("{day} · past", { day: dayName })
    if (mine) return t("Yours · {day}", { day: dayName })
    if (state === "free") return t("Free · {day}", { day: dayName })
    if (state === "resident") {
      return t("{name}'s permanent desk", { name: person?.name ?? t("Someone") })
    }

    return `${person?.name ?? t("Taken")} · ${dayName}`
  }
  const status = getStatus()

  const main = (
    <>
      {one && (
        <Row
          isSheet={isSheet}
          isPrimary
          icon={Check}
          label={shortDay ? t("Reserve {day}", { day: shortDay }) : t("Reserve this day")}
          isDisabled={pending}
          onPress={() => onReserve(one.free)}
        />
      )}
      {showWayFirst && (
        <Row
          isSheet={isSheet}
          isPrimary
          icon={Footprints}
          label={t("Show the way")}
          onPress={onShowWay}
        />
      )}
      {/* The rest: rows on a phone's sheet, a wrapped line of words beside the desk. */}
      <div
        className={clsx(
          isSheet ? "flex flex-col" : "flex flex-wrap items-center gap-x-5 gap-y-0.5 px-1"
        )}
      >
        {more.length > 0 && (
          <Row
            isSheet={isSheet}
            isLink={!isSheet}
            icon={CalendarDays}
            label={one ? t("Book more days") : t("Book it on other days")}
            hasStep
            onPress={() => setStep("days")}
          />
        )}
        {usual && (
          <Row
            isSheet={isSheet}
            isLink={!isSheet}
            icon={Repeat}
            label={
              usual.weekdays
                ? t("Usual desk · {days}", { days: weekdayNames(i18n, usual.weekdays) })
                : t("Make it my usual desk")
            }
            hasStep
            onPress={() => setStep("usual")}
          />
        )}
        {!showWayFirst && (
          <Row
            isSheet={isSheet}
            isLink={!isSheet}
            icon={Footprints}
            label={t("Show the way")}
            onPress={onShowWay}
          />
        )}
        {releaseChoices.map((choice) => (
          <Row
            key={choice.label}
            isSheet={isSheet}
            isLink={!isSheet}
            icon={CalendarX}
            label={t("Away? Give it up · {choice}", { choice: choice.label })}
            isDisabled={pending}
            onPress={() => onRelease(choice.days)}
          />
        ))}
        {canReclaim && (
          <Row
            isSheet={isSheet}
            isLink={!isSheet}
            icon={Undo2}
            label={shortDay ? t("Take {day} back", { day: shortDay }) : t("Take it back")}
            isDisabled={pending}
            onPress={onReclaim}
          />
        )}
        {canCancel && (
          <>
            {isSheet && <div className="mx-3 my-1 h-px bg-separator" />}
            <Row
              isSheet={isSheet}
              isLink={!isSheet}
              isDanger
              icon={LogOut}
              label={shortDay ? t("Cancel {day}", { day: shortDay }) : t("Cancel booking")}
              isDisabled={pending}
              onPress={onCancel}
            />
          </>
        )}
      </div>
    </>
  )

  const days = (
    <>
      <StepHeader
        i18n={i18n}
        title={one ? t("Book more days") : t("Book it on other days")}
        onBack={() => setStep("main")}
      />
      {/* The choices as ruled lines, as the headline's lists. */}
      <div className="mt-1 divide-y divide-separator border-y border-separator">
        {more.map((option) => (
          <Row
            key={option.key}
            isSheet={isSheet}
            icon={CalendarDays}
            label={option.title}
            detail={option.detail}
            isDisabled={pending || option.free.length === 0}
            onPress={() => onReserve(option.free)}
          />
        ))}
        <Row
          isSheet={isSheet}
          icon={CalendarDays}
          label={t("Pick days on a calendar")}
          hasStep
          onPress={onCustom}
        />
      </div>
    </>
  )

  return (
    // Centred on the anchor, lifted a little; the inner box animates.
    // Click-through: only the controls take the pointer — the card body sits
    // over the desks BEHIND this one (isometric), and must not block them.
    <div
      ref={cardRef}
      // The sheet is a sheet: a tap on it isn't a tap on the dimmed plan.
      className={clsx(
        isSheet
          ? "pointer-events-auto w-full"
          : clsx("pointer-events-none -translate-x-1/2", below ? "pt-3" : "-translate-y-full pb-3")
      )}
      style={isSheet ? swipe.style : undefined}
    >
      <div
        // The card lives inside the canvas container: without this, clicks on
        // its controls bubble to the scene, which reads them as a click on
        // empty floor and closes the card. The phone's sheet is portalled
        // over the shell, outside the canvas: only its clicks would still
        // reach the plan (through React); stopping its pointer events too
        // would keep React Aria from finishing a press (the Close button).
        onPointerDown={isSheet ? undefined : stop}
        onPointerUp={isSheet ? undefined : stop}
        onClick={stop}
        className={clsx(
          "relative flex flex-col text-foreground [&_button]:pointer-events-auto",
          isSheet
            ? clsx(
                "w-full gap-2 rounded-t-3xl border-t border-border bg-overlay px-4 pb-7 pt-2.5 shadow-overlay",
                closing ? "sheet-down" : "sheet-up"
              )
            : clsx(
                // The office's paper (no border), lifted just enough off the model.
                "w-80 gap-1 rounded-[28px] bg-background p-4 shadow-overlay",
                below ? "origin-top" : "origin-bottom",
                closing ? "seat-pop-out" : "seat-pop"
              )
        )}
      >
        {/* The sheet's top — its handle, and who has the desk — swipes it down to close. */}
        <div
          {...(isSheet ? swipe.handlers : {})}
          className={clsx(isSheet && "flex touch-none flex-col gap-2")}
        >
          {isSheet && (
            <span aria-hidden className="mx-auto mb-1 h-1.5 w-10 rounded-full bg-border" />
          )}

          {/* Who has it, when, what it offers — and your star. */}
          <div className="mb-1.5 flex items-center gap-2.5 px-1 pt-0.5">
            {person && onShowPerson && (
              // Their face opens their profile.
              <button
                type="button"
                aria-label={t("{name}'s profile", { name: person.name })}
                onClick={onShowPerson}
                className="shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                <MemberAvatar
                  m={{
                    userEmail: person.email,
                    displayName: person.name,
                    avatarUrl: person.avatarUrl,
                    role: "",
                  }}
                  className={clsx("shrink-0 rounded-full", isSheet ? "size-10" : "size-9")}
                />
              </button>
            )}
            {person && !onShowPerson && (
              <MemberAvatar
                m={{
                  userEmail: person.email,
                  displayName: person.name,
                  avatarUrl: person.avatarUrl,
                  role: "",
                }}
                className={clsx("shrink-0 rounded-full", isSheet ? "size-10" : "size-9")}
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                {/* The desk in large type, coloured by its state (the mockups' "D2"). */}
                <p
                  className={clsx(
                    "truncate leading-[0.95] font-black tracking-[-0.035em]",
                    isSheet ? "text-[40px]" : "text-[44px]",
                    getTitleTone({ isMine: !!mine, isFree: state === "free", isPast: !!past })
                  )}
                >
                  {title}
                </p>
                {canFavorite && (
                  <button
                    type="button"
                    aria-label={isFavorite ? t("Remove from favourites") : t("Add to favourites")}
                    aria-pressed={isFavorite}
                    onClick={onToggleFavorite}
                    className={clsx(
                      "grid size-7 shrink-0 place-items-center rounded-full transition-colors hover:bg-warning/15",
                      isFavorite ? "text-warning" : "text-muted"
                    )}
                  >
                    <Star className="size-4" fill={isFavorite ? "currentColor" : "none"} />
                  </button>
                )}
              </div>
              <p className="mt-1 truncate text-base font-bold text-foreground">
                <span>{status}</span>
                {features.length > 0 && ` · ${features.join(", ")}`}
              </p>
            </div>
            <DialogCloseButton
              onClose={onClose}
              className={clsx("shrink-0", isSheet && "size-10")}
            />
          </div>
        </div>

        {facts.length > 0 && step === "main" && (
          <ul className="flex flex-col gap-0.5 px-1 pb-2 text-[15px] leading-snug font-semibold text-muted">
            {facts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        )}

        {(note || past) && step === "main" && (
          <p className="px-1 pb-1.5 text-xs leading-snug text-muted">
            {past ? t("Past days can't be changed.") : note}
          </p>
        )}

        {step === "main" && main}
        {step === "days" && days}
        {step === "usual" && usual && (
          <UsualStep
            i18n={i18n}
            usual={usual}
            pending={pending}
            isSheet={isSheet}
            onBack={() => setStep("main")}
            onSet={(weekdays) => {
              onSetUsual(weekdays)
              setStep("main")
            }}
            onClear={() => {
              onClearUsual()
              setStep("main")
            }}
          />
        )}

        {/* Pointer to the desk */}
        {!isSheet && (
          <span
            className={clsx(
              "absolute left-1/2 size-3 -translate-x-1/2 bg-background",
              below ? "-top-1.5 rotate-[225deg]" : "-bottom-1.5 rotate-45"
            )}
          />
        )}
      </div>
    </div>
  )
}
