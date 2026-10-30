import { Button, CloseButton } from "@heroui/react"
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
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { useEditorStore } from "../store"
import { personByEmail, usePeople, type Person } from "./people"
import { deskName } from "./useBooking"
import { DESK_FEATURES } from "./deskFeatures"
import { MemberAvatar } from "~/components/office/shell-ui"
import { bookingPresets, deskState, type BookingPreset, type Day } from "~/utils/booking"
import { useI18n } from "~/i18n/I18nProvider"
import type { Translator } from "~/i18n/translate"

/** Must match the `seat-pop-out` animation duration in tailwind.css. */
const EXIT_MS = 140

/** One of the card's quick choices, worked out for this desk. */
interface Option {
  key: BookingPreset
  title: string
  detail: string
  /** The days in it this desk is free (what "Reserve" books). */
  free: Day[]
}

/**
 * Everything the desk card needs for the open desk (who has it, the booking
 * choices, what Reserve/Cancel do) — shared by the 3D card (anchored in the
 * scene) and the 2D floor plan's card. Null when no card is open.
 */
export const useSeatCard = () => {
  const card = useEditorStore((editorState) => editorState.seatCard)
  const objects = useEditorStore((editorState) => editorState.objects)
  const booking = useEditorStore((editorState) => editorState.booking)
  const closeSeatCard = useEditorStore((editorState) => editorState.closeSeatCard)
  const applyReserve = useEditorStore((editorState) => editorState.applyReserve)
  const applyCancel = useEditorStore((editorState) => editorState.applyCancel)
  const openCustomBooking = useEditorStore((editorState) => editorState.openCustomBooking)
  const showRoute = useEditorStore((editorState) => editorState.showRoute)
  const applyFavorite = useEditorStore((editorState) => editorState.applyFavorite)
  const people = usePeople()
  const i18n = useI18n()
  const { t, tn, format } = i18n
  const [closing, setClosing] = useState(false)
  const seat = card ? objects.find((piece) => piece.id === card.id) : undefined

  // A new desk (or reopening) starts fresh.
  useEffect(() => setClosing(false), [card?.id])

  // Animate out, then drop the card.
  const close = () => {
    setClosing(true)
    window.setTimeout(closeSeatCard, EXIT_MS)
  }

  useEffect(() => {
    if (!card) return
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && close()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [card])

  if (!card || !seat) return null
  const me = booking.me
  const { day, today, lastDay, byDay, released } = booking
  const state = booking.enabled
    ? deskState(seat, day, byDay, released)
    : seat.assignee
      ? ({ kind: "resident", email: seat.assignee } as const)
      : ({ kind: "free" } as const)
  const person = state.kind === "free" ? null : personByEmail(people, state.email)
  const mine = !!me && state.kind !== "free" && state.email === me
  const past = booking.enabled && day < today
  const myResidentDesk = me
    ? objects.find((piece) => piece.assignee === me && piece.id !== seat.id)
    : undefined
  // Your own permanent desk: give it up on days away, or take a day back.
  const isMyDesk = booking.enabled && !!me && seat.assignee === me
  const isGivenUp = (date: Day) => released[date]?.[seat.id] === me
  let releaseChoices: { label: string; days: Day[] }[] = []
  let canReclaim = false
  if (isMyDesk && !past) {
    if (isGivenUp(day)) canReclaim = state.kind === "free"
    else {
      const presets = bookingPresets(day, today, lastDay)
      releaseChoices = [
        { label: t("Just {day}", { day: format.short(day) }), days: presets.one },
        {
          label: t("Rest of the week ({from}–Fri)", { from: format.dow(day) }),
          days: presets.week,
        },
      ]
        .map((choice) => ({ ...choice, days: choice.days.filter((date) => !isGivenUp(date)) }))
        .filter((choice, i) => choice.days.length > 0 && (i === 0 || choice.days.length > 1))
    }
  }

  // Quick choices, for a bookable desk someone could still take.
  let options: Option[] = []
  let note: string | undefined
  if (isMyDesk) {
    if (state.kind === "booked")
      note = t("You gave {day} up, and it's been booked.", { day: format.short(day) })
    else if (state.kind === "free")
      note = t("You gave {day} up — others can book it.", { day: format.short(day) })
  } else if (booking.enabled && me && state.kind !== "resident" && !past && !mine) {
    if (seat.assignee)
      note = t("{name}'s permanent desk — free on the days they're away.", {
        name: personByEmail(people, seat.assignee)?.name ?? t("Someone"),
      })
    if (myResidentDesk)
      note = t("You have a permanent desk here ({desk}), so you can't book another.", {
        desk: deskName(i18n, myResidentDesk),
      })
    else {
      const presets = bookingPresets(day, today, lastDay)
      const describe = (days: Day[]) => {
        const free = days.filter((date) => deskState(seat, date, byDay, released).kind === "free")
        const taken = days.flatMap((date) => {
          const dayState = deskState(seat, date, byDay, released)
          return dayState.kind === "booked" && dayState.email !== me
            ? [
                `${format.dow(date)} ${personByEmail(people, dayState.email)?.name.split(" ")[0] ?? t("taken")}`,
              ]
            : []
        })
        const detail = taken.length
          ? `${t("{free} of {total} free", { free: free.length, total: days.length })} · ${taken.join(", ")}`
          : free.length === days.length
            ? days.length === 1
              ? t("Free")
              : tn(days.length, "All {n} day free", "All {n} days free")
            : t("Some are already yours")
        // Booking moves you: say so when you already sit elsewhere on those days.
        const moves = free.some((date) => Object.values(byDay[date] ?? {}).includes(me))
        return { free, detail: moves ? t("{detail} · moves you here", { detail }) : detail }
      }
      const presetChoices: [BookingPreset, string][] = [
        ["one", t("Just {day}", { day: format.short(day) })],
        ["week", t("Rest of the week ({from}–Fri)", { from: format.dow(day) })],
        ["every", format.everyWeekday(day)],
      ]
      options = presetChoices
        // A preset that's the same as a shorter one adds nothing.
        .filter(([key]) => key === "one" || presets[key].length > 1)
        .map(([key, title]) => {
          const { free, detail } = describe(presets[key])
          return {
            key,
            title,
            detail:
              key === "every"
                ? t("Until {day} · {detail}", {
                    day: { day: presets.every[presets.every.length - 1] },
                    detail,
                  })
                : detail,
            free,
          }
        })
        .filter((option) => option.free.length > 0 || option.key !== "one")
    }
  }

  // Favourite, features, and your usual desk.
  const { favorites, usual } = booking.preferences
  const isFavorite = favorites.includes(seat.id)
  const isMyUsual = usual?.deskId === seat.id
  const iAmResident = !!me && objects.some((piece) => piece.assignee === me)
  const usualElsewhere =
    usual && !isMyUsual ? objects.find((piece) => piece.id === usual.deskId) : undefined
  const body: BodyProps = {
    i18n,
    title: deskName(i18n, seat),
    features: DESK_FEATURES.filter((feature) => seat.features?.includes(feature.id)).map(
      (feature) => t(feature.label)
    ),
    canFavorite: booking.enabled && !!me,
    isFavorite,
    onToggleFavorite: () => {
      applyFavorite(seat.id, !isFavorite)
      booking.setPreference({
        intent: "favorite",
        deskId: seat.id,
        isFavorite: isFavorite ? "false" : "true",
      })
    },
    usual:
      booking.enabled && me && !seat.assignee && !iAmResident
        ? {
            weekdays: isMyUsual ? (usual?.weekdays ?? []) : null,
            replaces: usualElsewhere ? deskName(i18n, usualElsewhere) : undefined,
            // A new one starts on the shown day's weekday (Monday–Friday).
            suggested: [((new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7) + 1].filter(
              (weekday) => weekday <= 5
            ),
          }
        : null,
    onSetUsual: (weekdays) =>
      booking.setPreference({
        intent: "usual",
        deskId: seat.id,
        weekdays: JSON.stringify(weekdays),
      }),
    onClearUsual: () => booking.setPreference({ intent: "usual-clear" }),
    dayLabel: booking.enabled ? format.long(day) : undefined,
    state: state.kind,
    person,
    mine,
    past,
    note,
    options,
    pending: booking.pending,
    canCancel: booking.enabled && mine && state.kind === "booked" && !past,
    releaseChoices,
    canReclaim,
    closing,
    onClose: close,
    onReserve: (days) => {
      if (!me) return
      applyReserve(seat.id, me, days)
      booking.reserve([{ deskId: seat.id, dates: days }])
      close()
    },
    onCustom: () => openCustomBooking(seat.id),
    onShowWay: () => showRoute(seat.id),
    onCancel: () => {
      if (!me) return
      applyCancel(me, [day])
      booking.cancel([day])
      close()
    },
    onRelease: (days) => {
      booking.release(seat.id, days)
      close()
    },
    onReclaim: () => {
      booking.reclaim(seat.id, [day])
      close()
    },
  }
  return { seat, body, key: `${seat.id}:${day}` }
}

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
  mine: boolean
  past: boolean
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
}) => (
  <button
    type="button"
    disabled={isDisabled}
    onClick={onPress}
    className={clsx(
      "flex w-full items-center gap-2.5 rounded-xl px-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50",
      isSheet ? "min-h-12 py-2.5" : detail ? "min-h-11 py-1.5" : "h-10",
      isPrimary
        ? "mb-1 bg-accent font-extrabold text-accent-foreground hover:brightness-105"
        : clsx("font-bold hover:bg-foreground/5", isDanger ? "text-danger" : "text-foreground")
    )}
  >
    <Icon
      className={clsx("size-4 shrink-0", !isPrimary && !isDanger && "text-accent")}
      strokeWidth={isPrimary ? 2.6 : 2}
    />
    <span className="min-w-0 flex-1">
      <span className={clsx("block leading-tight", isSheet ? "text-[0.95rem]" : "text-[0.82rem]")}>
        {label}
      </span>
      {detail && (
        <span
          className={clsx(
            "block truncate text-[0.7rem] font-semibold",
            isPrimary ? "text-accent-foreground/80" : "text-muted"
          )}
        >
          {detail}
        </span>
      )}
    </span>
    {hasStep && <ChevronRight className="size-4 shrink-0 text-muted" />}
  </button>
)

/** A step's title bar: back to the card's main list. */
const StepHeader = ({
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
    <p className="text-sm font-extrabold">{title}</p>
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
  mine,
  past,
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

  // Above the desk by default; a desk near the top of the screen gets the card
  // below it instead, so it's never cut off. Decided once, before paint.
  const cardRef = useRef<HTMLDivElement>(null)
  const [below, setBelow] = useState(false)
  useLayoutEffect(() => {
    const top = cardRef.current?.getBoundingClientRect().top ?? 0
    if (!isSheet && top < 8) setBelow(true)
  }, [isSheet])

  // The shown day alone, and the longer choices (for "Book more days").
  const one = options.find((option) => option.key === "one" && option.free.length > 0)
  const more = options.filter((option) => option.key !== "one")
  const showWayFirst = mine && !one
  const shortDay = dayLabel?.split(" ").slice(0, 2).join(" ")
  const status = past
    ? t("{day} · past", { day: dayLabel ?? "" })
    : mine
      ? t("Yours · {day}", { day: dayLabel ?? "" })
      : state === "free"
        ? t("Free · {day}", { day: dayLabel ?? "" })
        : state === "resident"
          ? t("{name}'s permanent desk", { name: person?.name ?? t("Someone") })
          : `${person?.name ?? t("Taken")} · ${dayLabel ?? ""}`

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
      {more.length > 0 && (
        <Row
          isSheet={isSheet}
          icon={CalendarDays}
          label={one ? t("Book more days") : t("Book it on other days")}
          hasStep
          onPress={() => setStep("days")}
        />
      )}
      {usual && (
        <Row
          isSheet={isSheet}
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
        <Row isSheet={isSheet} icon={Footprints} label={t("Show the way")} onPress={onShowWay} />
      )}
      {releaseChoices.map((choice) => (
        <Row
          key={choice.label}
          isSheet={isSheet}
          icon={CalendarX}
          label={t("Away? Give it up · {choice}", { choice: choice.label })}
          isDisabled={pending}
          onPress={() => onRelease(choice.days)}
        />
      ))}
      {canReclaim && (
        <Row
          isSheet={isSheet}
          icon={Undo2}
          label={shortDay ? t("Take {day} back", { day: shortDay }) : t("Take it back")}
          isDisabled={pending}
          onPress={onReclaim}
        />
      )}
      {canCancel && (
        <>
          <div className="mx-3 my-1 h-px bg-separator" />
          <Row
            isSheet={isSheet}
            isDanger
            icon={LogOut}
            label={shortDay ? t("Cancel {day}", { day: shortDay }) : t("Cancel booking")}
            isDisabled={pending}
            onPress={onCancel}
          />
        </>
      )}
    </>
  )

  const days = (
    <>
      <StepHeader
        i18n={i18n}
        title={one ? t("Book more days") : t("Book it on other days")}
        onBack={() => setStep("main")}
      />
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
    </>
  )

  return (
    // Centred on the anchor, lifted a little; the inner box animates.
    // Click-through: only the controls take the pointer — the card body sits
    // over the desks BEHIND this one (isometric), and must not block them.
    <div
      ref={cardRef}
      className={clsx(
        "pointer-events-none",
        isSheet ? "w-full" : clsx("-translate-x-1/2", below ? "pt-3" : "-translate-y-full pb-3")
      )}
    >
      <div
        // The card lives inside the canvas container: without this, clicks on
        // its controls bubble to the scene, which reads them as a click on
        // empty floor and closes the card.
        onPointerDown={stop}
        onPointerUp={stop}
        onClick={stop}
        className={clsx(
          "relative flex flex-col text-foreground [&_button]:pointer-events-auto",
          isSheet
            ? clsx(
                "w-full gap-2 rounded-t-3xl border-t border-border bg-overlay px-4 pb-7 pt-2.5 shadow-overlay",
                closing ? "sheet-down" : "sheet-up"
              )
            : clsx(
                "w-72 gap-0.5 rounded-2xl border border-border bg-overlay/95 p-2.5 shadow-overlay backdrop-blur-md",
                below ? "origin-top" : "origin-bottom",
                closing ? "seat-pop-out" : "seat-pop"
              )
        )}
      >
        {isSheet && <span aria-hidden className="mx-auto mb-1 h-1.5 w-10 rounded-full bg-border" />}

        {/* Who has it, when, what it offers — and your star. */}
        <div className="mb-1.5 flex items-center gap-2.5 px-1 pt-0.5">
          {person && (
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
              <p className={clsx("truncate font-black", isSheet ? "text-lg" : "text-base")}>
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
            <p className="truncate text-xs text-muted">
              <span
                className={clsx(
                  "font-bold",
                  mine ? "text-accent" : state === "free" && !past ? "text-success" : undefined
                )}
              >
                {status}
              </span>
              {features.length > 0 && ` · ${features.join(", ")}`}
            </p>
          </div>
          <CloseButton
            aria-label={t("Close")}
            onPress={onClose}
            className={clsx("shrink-0", isSheet && "size-10")}
          />
        </div>

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
              "absolute left-1/2 size-3 -translate-x-1/2 border-b border-r border-border bg-overlay",
              below ? "-top-1.5 rotate-[225deg]" : "-bottom-1.5 rotate-45"
            )}
          />
        )}
      </div>
    </div>
  )
}

/**
 * Your usual desk: booked for you on the weekdays picked, as each opens up for
 * booking (a taken day gets a similar desk; a full day, the waitlist).
 */
const UsualStep = ({
  i18n,
  usual,
  pending,
  isSheet,
  onBack,
  onSet,
  onClear,
}: {
  i18n: Translator
  usual: NonNullable<BodyProps["usual"]>
  pending: boolean
  isSheet: boolean
  onBack: () => void
  onSet: (weekdays: number[]) => void
  onClear: () => void
}) => {
  const [days, setDays] = useState<number[]>(usual.weekdays ?? usual.suggested)
  const isUsual = !!usual.weekdays
  const { t, format } = i18n
  return (
    <div className="flex flex-col gap-2.5">
      <StepHeader i18n={i18n} title={t("Your usual desk")} onBack={onBack} />
      <div className="flex gap-1 px-1">
        {format.workdays().map((name, i) => {
          const weekday = i + 1
          const on = days.includes(weekday)
          return (
            <button
              key={name}
              type="button"
              aria-pressed={on}
              onClick={() =>
                setDays(
                  on
                    ? days.filter((selected) => selected !== weekday)
                    : [...days, weekday].sort((first, second) => first - second)
                )
              }
              className={clsx(
                "flex-1 rounded-lg border text-xs font-bold transition-colors",
                isSheet ? "h-11" : "h-9",
                on
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border text-muted hover:border-muted"
              )}
            >
              {name.slice(0, 2)}
            </button>
          )
        })}
      </div>
      <p className="px-1 text-[0.72rem] leading-snug text-muted">
        {t(
          "Booked for you as each day opens up. If it's taken, you get a similar desk; if the office is full, a place on the waitlist."
        )}
        {usual.replaces && ` ${t("Replaces your usual {desk}.", { desk: usual.replaces })}`}
      </p>
      <div className="flex items-center justify-between gap-2 px-1">
        {isUsual ? (
          <button
            type="button"
            disabled={pending}
            onClick={onClear}
            className="text-xs font-bold text-danger hover:underline"
          >
            {t("Stop booking it")}
          </button>
        ) : (
          <span />
        )}
        <Button
          size={isSheet ? "md" : "sm"}
          variant="primary"
          isDisabled={!days.length || pending}
          onPress={() => onSet(days)}
        >
          {isUsual ? t("Save days") : t("Make it my usual desk")}
        </Button>
      </div>
    </div>
  )
}
