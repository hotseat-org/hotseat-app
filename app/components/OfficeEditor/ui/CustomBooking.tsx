import { Modal, Tooltip } from "@heroui/react"
import clsx from "clsx"
import { Armchair, ArrowDown, ArrowLeftRight, ArrowRight, Check, X } from "lucide-react"
import { useMemo, useState, type ReactNode } from "react"
import { personByEmail, usePeople } from "../people"
import { useEditorStore } from "../store"
import { isSeatable, type SceneObject } from "../types"
import { deskName } from "../useBooking"
import { useIsMobile } from "~/utils/hooks/useIsMobile"
import {
  addDays,
  deskState,
  isWeekend,
  weekNumber,
  weekStart,
  type BookingsByDay,
  type Day,
  type DeskDays,
} from "~/utils/booking"
import { useI18n } from "~/i18n/I18nProvider"
import type { Translator } from "~/i18n/translate"

/** "Every Wednesday" in a sentence: "every Wednesday" / "každou středu". */
const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1)

/** What one calendar day means for the desk being booked. */
type Cell =
  | { kind: "closed"; day: Day; label: string }
  | { kind: "yours"; day: Day }
  | { kind: "free"; day: Day; isWeekend: boolean; currentDesk?: SceneObject }
  | { kind: "taken"; day: Day; holder: string; alternative?: SceneObject }

const distance = (first: SceneObject, second: SceneObject) =>
  Math.hypot(first.x - second.x, first.z - second.z)

/** The free desk closest to `desk` on a day, for when `desk` itself is taken. */
const findNearestFreeDesk = (
  desk: SceneObject,
  desks: SceneObject[],
  day: Day,
  byDay: BookingsByDay,
  released: BookingsByDay
) =>
  desks
    .filter(
      (candidate) =>
        candidate.id !== desk.id && deskState(candidate, day, byDay, released).kind === "free"
    )
    .sort((first, second) => distance(first, desk) - distance(second, desk))[0]

/**
 * Booking a desk on any days: the bookable weeks as a calendar (Mon–Sun), with
 * weekday headings to take that day every week, and week numbers for a whole week.
 * A day someone else has can be picked too — it books the nearest free desk.
 */
export const CustomBooking = () => {
  const customBooking = useEditorStore((state) => state.customBooking)
  const close = useEditorStore((state) => state.closeCustomBooking)
  const objects = useEditorStore((state) => state.objects)
  const desk = customBooking ? objects.find((object) => object.id === customBooking.id) : undefined
  const isPhone = useIsMobile()
  if (!desk) return null
  return (
    <Modal.Backdrop isOpen onOpenChange={(isOpen) => !isOpen && close()} isDismissable>
      <Modal.Container
        scroll="inside"
        placement={isPhone ? "bottom" : "auto"}
        className={isPhone ? "p-0" : "w-auto"}
      >
        {/* Edge-to-edge header and footer bands, no inner padding: a 24px-cornered
            dialog on desktop, a sheet rising almost to the top on a phone. */}
        <Modal.Dialog
          className={clsx(
            "max-w-full overflow-hidden p-0",
            isPhone
              ? "mt-auto h-[calc(var(--visual-viewport-height)-44px)] w-full rounded-t-3xl rounded-b-none"
              : "w-[880px] rounded-3xl"
          )}
        >
          {/* Remount per desk: the picks start over. */}
          <CustomBookingBody key={desk.id} desk={desk} isPhone={isPhone} onClose={close} />
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  )
}

const CustomBookingBody = ({
  desk,
  isPhone,
  onClose,
}: {
  desk: SceneObject
  isPhone: boolean
  onClose: () => void
}) => {
  const objects = useEditorStore((state) => state.objects)
  const booking = useEditorStore((state) => state.booking)
  const applyReserve = useEditorStore((state) => state.applyReserve)
  const people = usePeople()
  const i18n = useI18n()
  const { t, tn, format } = i18n
  const { me, today, lastDay, byDay, released } = booking

  const weeks = useMemo(() => {
    const desks = objects.filter((object) => isSeatable(object.type))
    const describe = (day: Day): Cell => {
      if (day < today) return { kind: "closed", day, label: "" }
      if (day > lastDay) return { kind: "closed", day, label: t("Not open") }
      const state = deskState(desk, day, byDay, released)
      if (state.kind !== "free" && state.email === me) return { kind: "yours", day }
      // Where you already sit that day (booking here moves you).
      const currentDesk = desks.find((resident) => {
        const status = deskState(resident, day, byDay, released)
        return status.kind !== "free" && status.email === me
      })
      if (state.kind === "free")
        return { kind: "free", day, isWeekend: isWeekend(day), currentDesk }
      const holder = personByEmail(people, state.email)?.name.split(" ")[0] ?? t("Someone")
      // Already seated elsewhere: nothing to move you to.
      const alternative = currentDesk
        ? undefined
        : findNearestFreeDesk(desk, desks, day, byDay, released)
      return { kind: "taken", day, holder, alternative }
    }
    const generatedWeeks: { start: Day; number: number; cells: Cell[] }[] = []
    for (let start = weekStart(today); start <= lastDay; start = addDays(start, 7))
      generatedWeeks.push({
        start,
        number: weekNumber(start),
        cells: [0, 1, 2, 3, 4, 5, 6].map((i) => describe(addDays(start, i))),
      })
    return generatedWeeks
  }, [objects, desk, today, lastDay, byDay, released, me, people, t])

  const cells = weeks.flatMap((week) => week.cells)
  // Days you can pick: free ones, and taken ones with a desk to move to.
  const isPickable = (cell: Cell) =>
    cell.kind === "free" || (cell.kind === "taken" && !!cell.alternative)
  // Weekday headings and whole weeks take working days only.
  const isWorkday = (cell: Cell) => isPickable(cell) && !(cell.kind === "free" && cell.isWeekend)

  const [picked, setPicked] = useState<Set<Day>>(() => {
    const shown = cells.find((cell) => cell.day === booking.day)
    return new Set(shown && isPickable(shown) ? [shown.day] : [])
  })
  const toggle = (day: Day) =>
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(day)) next.delete(day)
      else next.add(day)
      return next
    })
  // Pick all of a group, or clear it when it's all picked already.
  const toggleAll = (group: Cell[]) =>
    setPicked((prev) => {
      const next = new Set(prev)
      const isFull = group.every((cell) => next.has(cell.day))
      for (const cell of group) {
        if (isFull) next.delete(cell.day)
        else next.add(cell.day)
      }
      return next
    })

  // A weekday's heading picks that day in every week (Mon–Fri only).
  const columns = format.weekShort().map((short, i) => ({
    short,
    every: format.everyWeekday(addDays(weekStart(today), i)),
    days: i < 5 ? weeks.map((week) => week.cells[i]).filter(isWorkday) : [],
  }))
  const pickedCells = cells.filter((cell) => picked.has(cell.day))

  const reserve = () => {
    if (!me) return
    const byDesk = new Map<string, Day[]>()
    for (const cell of pickedCells) {
      const deskId = cell.kind === "taken" ? cell.alternative?.id : desk.id
      if (deskId) byDesk.set(deskId, [...(byDesk.get(deskId) ?? []), cell.day])
    }
    const picks: DeskDays[] = [...byDesk].map(([deskId, dates]) => ({ deskId, dates }))
    for (const pick of picks) applyReserve(pick.deskId, me, pick.dates)
    booking.reserve(picks)
    onClose()
  }
  const reserveLabel = picked.size
    ? tn(picked.size, "Reserve {n} day", "Reserve {n} days")
    : t("Reserve")

  if (isPhone)
    return (
      <PhoneLayout
        i18n={i18n}
        desk={desk}
        lastDay={lastDay}
        weeks={weeks}
        columns={columns.filter((column) => column.days.length)}
        picked={picked}
        isPickable={isPickable}
        isWorkday={isWorkday}
        onToggle={toggle}
        onToggleAll={toggleAll}
        onClear={() => setPicked(new Set())}
        onReserve={reserve}
        reserveLabel={reserveLabel}
        isPending={booking.pending}
        onClose={onClose}
      />
    )

  return (
    <>
      <div className="flex h-[68px] shrink-0 items-center gap-3 border-b border-border pl-6 pr-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-accent/10 text-accent">
          <Armchair className="size-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <Modal.Heading className="block truncate text-lg font-black text-foreground">
            {t("Book {desk}", { desk: deskName(i18n, desk) })}
          </Modal.Heading>
          <p className="truncate text-[13px] text-muted">
            {t("Bookable until {day}", { day: { day: lastDay } })}
          </p>
        </div>
        <button
          type="button"
          aria-label={t("Close")}
          onClick={onClose}
          className="grid size-10 shrink-0 place-items-center rounded-full text-muted outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
        >
          <X className="size-[18px]" strokeWidth={2.4} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-[18px]">
        <div className="flex gap-6">
          <div className="flex flex-col gap-1.5">
            <div className={GRID}>
              <span />
              {columns.map((column) => {
                const isFull =
                  column.days.length > 0 && column.days.every((cell) => picked.has(cell.day))
                const tooltip = isFull
                  ? t("Clear {every}", { every: lowerFirst(column.every) })
                  : t("Pick {every}", { every: lowerFirst(column.every) })
                return column.days.length ? (
                  <WithTooltip key={column.short} tip={tooltip}>
                    <button
                      type="button"
                      aria-label={tooltip}
                      onClick={() => toggleAll(column.days)}
                      className={clsx(
                        WEEKDAY,
                        PICK_ALL,
                        "flex items-center justify-center gap-0.5 rounded-[9px] py-1",
                        isFull ? PICK_ALL_ON : PICK_ALL_OFF
                      )}
                    >
                      {column.short}
                      <ArrowDown className="size-3 shrink-0" strokeWidth={2.6} />
                    </button>
                  </WithTooltip>
                ) : (
                  <span
                    key={column.short}
                    aria-hidden
                    className={clsx(WEEKDAY, "border-[1.5px] border-transparent py-1 text-muted")}
                  >
                    {column.short}
                  </span>
                )
              })}
            </div>
            {weeks.map((week) => {
              const workdays = week.cells.filter(isWorkday)
              const isFull = workdays.length > 0 && workdays.every((cell) => picked.has(cell.day))
              const tooltip = isFull
                ? t("Clear week {n}", { n: week.number })
                : t("Pick all of week {n}", { n: week.number })
              return (
                <div key={week.start} className={GRID}>
                  <WithTooltip tip={workdays.length ? tooltip : undefined}>
                    <button
                      type="button"
                      aria-label={tooltip}
                      disabled={!workdays.length}
                      onClick={() => toggleAll(workdays)}
                      className={clsx(
                        PICK_ALL,
                        "flex h-full flex-col items-center justify-center gap-0.5 rounded-[12px] text-xs font-extrabold disabled:pointer-events-none disabled:opacity-40",
                        isFull ? PICK_ALL_ON : PICK_ALL_OFF
                      )}
                    >
                      {t("W{n}", { n: week.number })}
                      <ArrowRight className="size-3 shrink-0" strokeWidth={2.6} />
                    </button>
                  </WithTooltip>
                  {week.cells.map((cell) => (
                    <DayCell
                      key={cell.day}
                      i18n={i18n}
                      cell={cell}
                      isPicked={picked.has(cell.day)}
                      isPickable={isPickable(cell)}
                      onToggle={() => toggle(cell.day)}
                    />
                  ))}
                </div>
              )
            })}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Legend i18n={i18n} />
          </div>
        </div>
      </div>

      <div className="flex h-[76px] shrink-0 items-center justify-end gap-2.5 border-t border-border pl-6 pr-5">
        <button
          type="button"
          disabled={!picked.size}
          onClick={() => setPicked(new Set())}
          className={clsx(FOOTER_BUTTON, "px-4 text-accent enabled:hover:bg-accent/10")}
        >
          {t("Clear")}
        </button>
        <button
          type="button"
          onClick={onClose}
          className={clsx(
            FOOTER_BUTTON,
            "bg-default px-5 text-default-foreground hover:brightness-95"
          )}
        >
          {t("Cancel")}
        </button>
        <button
          type="button"
          disabled={!picked.size || booking.pending}
          onClick={reserve}
          className={clsx(
            FOOTER_BUTTON,
            "gap-2 bg-accent px-[22px] font-extrabold text-accent-foreground enabled:hover:brightness-110"
          )}
        >
          <Check className="size-4" strokeWidth={2.5} />
          {reserveLabel}
        </button>
      </div>
    </>
  )
}

/**
 * The weekday headings and week numbers pick a whole column / row, so they
 * look like buttons: a tinted chip with an arrow toward what they pick, solid
 * accent once all of it is picked.
 */
const PICK_ALL =
  "border-[1.5px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus"
const PICK_ALL_OFF =
  "border-border bg-surface-secondary text-foreground hover:border-accent hover:bg-accent/10 hover:text-accent"
const PICK_ALL_ON = "border-accent bg-accent text-accent-foreground"

/** A weekday heading: Mon, Tue… */
const WEEKDAY = "text-center text-[11px] font-extrabold uppercase tracking-[0.08em]"

/** The footer's pill buttons, as in the mockup: 44px tall, 15px bold. */
const FOOTER_BUTTON =
  "flex h-11 items-center rounded-full text-[15px] font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50"

/** Week number + Mon–Sun, square 68px days. */
const GRID = "grid grid-cols-[40px_repeat(7,68px)] gap-1.5"

const WithTooltip = ({ tip: tooltip, children }: { tip?: string; children: ReactNode }) =>
  tooltip ? (
    <Tooltip delay={300}>
      {children}
      <Tooltip.Content className="max-w-56 rounded-lg bg-foreground px-2.5 py-1.5 text-xs font-semibold text-background shadow-overlay">
        {tooltip}
      </Tooltip.Content>
    </Tooltip>
  ) : (
    children
  )

/** How a day reads: its label, tooltip/explanation, colours and corner mark. */
const getDayLook = (i18n: Translator, cell: Cell, isPicked: boolean) => {
  const { t, format } = i18n
  const when = format.onDay(cell.day)
  const isMove = cell.kind === "free" && !!cell.currentDesk
  const isElsewhere = cell.kind === "taken" && isPicked
  let label: string
  let tooltip: string | undefined
  let tone: string
  if (cell.kind === "closed") {
    label = cell.label
    tone = "border-transparent text-muted/60"
  } else if (cell.kind === "yours") {
    label = t("Yours")
    tooltip = t("You already have this desk {when}.", { when })
    tone = "border-dashed border-accent bg-accent/8 text-accent"
  } else if (cell.kind === "taken") {
    const alternative = cell.alternative ? deskName(i18n, cell.alternative) : undefined
    const holder = cell.holder
    label = isPicked && alternative ? alternative : holder
    tooltip = !alternative
      ? t("{holder} has this desk {when}.", { holder, when })
      : isPicked
        ? t(
            "{holder} has this desk {when}, so you get {alternative}, the nearest free desk. Tap to drop the day.",
            { holder, when, alternative }
          )
        : t(
            "{holder} has this desk {when}. Tap to book {alternative}, the nearest free desk, instead.",
            { holder, when, alternative }
          )
    tone = isPicked
      ? "border-transparent bg-accent/55 text-foreground"
      : "border-transparent bg-surface-tertiary text-muted"
  } else {
    const current = cell.currentDesk ? deskName(i18n, cell.currentDesk) : undefined
    // Plain days need no words: the colour (and a check when picked) says it.
    label = isPicked ? (isMove ? t("Moves you") : "") : (current ?? "")
    if (current)
      tooltip = isPicked
        ? t("You sit at {desk} {when}. Booking moves you here.", { desk: current, when })
        : t("You sit at {desk} {when}. Picking it moves you here.", { desk: current, when })
    tone = isPicked
      ? isMove
        ? "border-transparent bg-[color-mix(in_oklab,var(--accent)_72%,black)] text-accent-foreground"
        : "border-transparent bg-accent text-accent-foreground"
      : isMove
        ? "border-warning bg-warning/15 text-foreground"
        : clsx("border-border bg-surface", cell.isWeekend && "text-muted")
  }
  const aria =
    `${format.long(cell.day)}, ${label || (cell.kind === "free" ? t("free") : "")}`.replace(
      /, $/,
      ""
    )
  return { label, tip: tooltip, tone, aria, isMove, isElsewhere }
}

/** The small icon in a day's corner: picked, moves you, or another desk. */
const DayMark = ({ i18n, cell, isPicked }: { i18n: Translator; cell: Cell; isPicked: boolean }) => {
  const { isMove, isElsewhere } = getDayLook(i18n, cell, isPicked)
  if (isMove)
    return (
      <ArrowLeftRight
        className={clsx("size-3.5 shrink-0", isPicked ? "text-warning" : "text-warning-foreground")}
        strokeWidth={2.4}
      />
    )
  if (isElsewhere) return <Armchair className="size-3.5 shrink-0" strokeWidth={2.2} />
  if (isPicked && cell.kind === "free")
    return <Check className="size-3.5 shrink-0" strokeWidth={3} />
  return null
}

const DayCell = ({
  i18n,
  cell,
  isPicked,
  isPickable,
  onToggle,
}: {
  i18n: Translator
  cell: Cell
  isPicked: boolean
  isPickable: boolean
  onToggle: () => void
}) => {
  const date = Number(cell.day.slice(8, 10))
  // "1 Nov" on the first of a month.
  const number = date === 1 ? i18n.format.dayMonth(cell.day) : String(date)
  const { label, tip: tooltip, tone, aria } = getDayLook(i18n, cell, isPicked)

  return (
    <WithTooltip tip={tooltip}>
      <button
        type="button"
        aria-pressed={isPickable ? isPicked : undefined}
        aria-label={aria}
        disabled={!isPickable}
        onClick={onToggle}
        className={clsx(
          // Every state keeps the same border width (its tone sets the colour), so
          // picking a day never shifts its content.
          "relative flex size-[68px] flex-col items-start justify-between rounded-[12px] border-[1.5px] p-2 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus",
          isPickable && "cursor-pointer",
          tone
        )}
      >
        <span className="flex w-full items-center justify-between gap-1">
          <span className="truncate text-[15px] font-extrabold">{number}</span>
          <DayMark i18n={i18n} cell={cell} isPicked={isPicked} />
        </span>
        <span className="w-full truncate text-[11px] font-bold">{label}</span>
      </button>
    </WithTooltip>
  )
}

interface Week {
  start: Day
  number: number
  cells: Cell[]
}

/**
 * Phones: week by week. Each week is a row of Mon–Fri (narrow Sat/Sun at the
 * end) under its number and a "Whole week" toggle; "Every Mon…" chips pick a
 * weekday in every week. Clear + one big Reserve at the bottom.
 */
const PhoneLayout = ({
  i18n,
  desk,
  lastDay,
  weeks,
  columns,
  picked,
  isPickable,
  isWorkday,
  onToggle,
  onToggleAll,
  onClear,
  onReserve,
  reserveLabel,
  isPending,
  onClose,
}: {
  i18n: Translator
  desk: SceneObject
  lastDay: Day
  weeks: Week[]
  columns: { short: string; every: string; days: Cell[] }[]
  picked: Set<Day>
  isPickable: (cell: Cell) => boolean
  isWorkday: (cell: Cell) => boolean
  onToggle: (day: Day) => void
  onToggleAll: (group: Cell[]) => void
  onClear: () => void
  onReserve: () => void
  reserveLabel: string
  isPending: boolean
  onClose: () => void
}) => {
  const isAllPicked = (group: Cell[]) =>
    group.length > 0 && group.every((cell) => picked.has(cell.day))
  const { t, format } = i18n
  return (
    <>
      <span aria-hidden className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-border" />
      <div className="flex shrink-0 items-center gap-2.5 pb-2.5 pl-5 pr-2 pt-1.5">
        <div className="min-w-0 flex-1">
          <Modal.Heading className="block truncate text-lg font-black text-foreground">
            {t("Book {desk}", { desk: deskName(i18n, desk) })}
          </Modal.Heading>
          <p className="truncate text-[13px] text-muted">
            {t("Bookable until {day}", { day: { day: lastDay } })}
          </p>
        </div>
        <button
          type="button"
          aria-label={t("Close")}
          onClick={onClose}
          className="grid size-11 shrink-0 place-items-center rounded-full text-muted outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <X className="size-[18px]" strokeWidth={2.4} />
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-border px-4 pb-3">
        <span className="mr-0.5 shrink-0 text-[11px] font-extrabold uppercase tracking-[0.08em] text-muted">
          {t("Every")}
        </span>
        {columns.map((column) => {
          const isOn = isAllPicked(column.days)
          return (
            <button
              key={column.short}
              type="button"
              aria-pressed={isOn}
              aria-label={column.every}
              onClick={() => onToggleAll(column.days)}
              className={clsx(
                PICK_ALL,
                "h-9 shrink-0 rounded-full px-3.5 text-[13px] font-extrabold",
                isOn ? PICK_ALL_ON : PICK_ALL_OFF
              )}
            >
              {column.short}
            </button>
          )
        })}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-[18px] overflow-y-auto px-4 py-3.5">
        {weeks.map((week) => {
          const workdays = week.cells.filter(isWorkday)
          const isOn = isAllPicked(workdays)
          const first = week.cells[0].day
          const last = week.cells[6].day
          return (
            <section
              key={week.start}
              aria-label={t("Week {n}", { n: week.number })}
              className="flex flex-col gap-2"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-extrabold">
                  {t("W{n}", { n: week.number })}{" "}
                  <span className="font-semibold text-muted">
                    · {format.dayMonth(first)} – {format.dayMonth(last)}
                  </span>
                </p>
                {workdays.length > 0 && (
                  <button
                    type="button"
                    aria-pressed={isOn}
                    onClick={() => onToggleAll(workdays)}
                    className={clsx(
                      PICK_ALL,
                      "h-8 shrink-0 rounded-full px-3 text-xs font-extrabold",
                      isOn ? PICK_ALL_ON : PICK_ALL_OFF
                    )}
                  >
                    {t("Whole week")}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-[repeat(5,minmax(0,1fr))_30px_30px] gap-[5px]">
                {week.cells.map((cell, i) => (
                  <PhoneDayCell
                    key={cell.day}
                    i18n={i18n}
                    cell={cell}
                    weekday={format.weekShort()[i]}
                    isNarrow={i >= 5}
                    isPicked={picked.has(cell.day)}
                    isPickable={isPickable(cell)}
                    onToggle={() => onToggle(cell.day)}
                  />
                ))}
              </div>
            </section>
          )
        })}
      </div>

      <div className="flex shrink-0 items-center gap-2 border-t border-border px-4 pb-[max(26px,env(safe-area-inset-bottom))] pt-3">
        <button
          type="button"
          disabled={!picked.size}
          onClick={onClear}
          className="h-[52px] rounded-full px-4 text-[15px] font-bold text-accent outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50"
        >
          {t("Clear")}
        </button>
        <button
          type="button"
          disabled={!picked.size || isPending}
          onClick={onReserve}
          className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-full bg-accent text-base font-extrabold text-accent-foreground outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50"
        >
          <Check className="size-[18px]" strokeWidth={2.5} />
          {reserveLabel}
        </button>
      </div>
    </>
  )
}

/** A phone day: weekday and date stacked, a mark in the corner. */
const PhoneDayCell = ({
  i18n,
  cell,
  weekday,
  isNarrow,
  isPicked,
  isPickable,
  onToggle,
}: {
  i18n: Translator
  cell: Cell
  weekday: string
  /** Sat/Sun's slim column: always the two-letter name. */
  isNarrow: boolean
  isPicked: boolean
  isPickable: boolean
  onToggle: () => void
}) => {
  const { tone, aria, isMove, isElsewhere } = getDayLook(i18n, cell, isPicked)
  // The corner badge — sits on the corner, clear of the weekday and date.
  const badge = isMove
    ? { look: "bg-warning text-warning-foreground", mark: <ArrowLeftRight strokeWidth={2.6} /> }
    : isElsewhere
      ? { look: "bg-overlay text-foreground", mark: <Armchair strokeWidth={2.4} /> }
      : isPicked && cell.kind === "free"
        ? { look: "bg-overlay text-accent", mark: <Check strokeWidth={3.5} /> }
        : cell.kind === "taken" // whose it is, by initial
          ? { look: "bg-muted text-background", mark: cell.holder[0] }
          : undefined
  return (
    <button
      type="button"
      aria-pressed={isPickable ? isPicked : undefined}
      aria-label={aria}
      disabled={!isPickable}
      onClick={onToggle}
      className={clsx(
        "relative flex h-[58px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-[12px] border-[1.5px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus",
        tone
      )}
    >
      <span className="text-[10px] font-extrabold uppercase tracking-[0.04em] opacity-75">
        {isNarrow ? (
          weekday.slice(0, 2)
        ) : (
          <>
            {/* Under 360px the days get narrow: two letters leave the badge room. */}
            <span className="max-[359px]:hidden">{weekday}</span>
            <span className="hidden max-[359px]:inline">{weekday.slice(0, 2)}</span>
          </>
        )}
      </span>
      <span className="text-base font-extrabold">{Number(cell.day.slice(8, 10))}</span>
      {badge && (
        <span
          aria-hidden
          className={clsx(
            "absolute -right-1 -top-1 grid size-[18px] place-items-center rounded-full text-[10px] font-black shadow-sm ring-2 ring-overlay [&_svg]:size-2.5",
            badge.look
          )}
        >
          {badge.mark}
        </span>
      )}
    </button>
  )
}

const Legend = ({ i18n: { t } }: { i18n: Translator }) => (
  <ul className="flex flex-col gap-2 pt-9 text-xs text-muted">
    <li className="mb-1 leading-snug">
      {t("Tap a weekday or a week number to pick all of it at once.")}
    </li>
    <LegendItem
      swatch="bg-accent text-accent-foreground"
      icon={<Check className="size-2.5" strokeWidth={3.5} />}
    >
      {t("Picked")}
    </LegendItem>
    <LegendItem swatch="border-[1.5px] border-border bg-surface">{t("Free")}</LegendItem>
    <LegendItem swatch="bg-surface-tertiary">{t("Taken · tap for another desk")}</LegendItem>
    <LegendItem swatch="border-[1.5px] border-dashed border-accent bg-accent/8">
      {t("Already yours")}
    </LegendItem>
    <LegendItem
      swatch="bg-[color-mix(in_oklab,var(--accent)_72%,black)] text-warning"
      icon={<ArrowLeftRight className="size-2.5" strokeWidth={2.6} />}
    >
      {t("Moves you from another desk")}
    </LegendItem>
    <LegendItem swatch="bg-accent/55 text-foreground" icon={<Armchair className="size-2.5" />}>
      {t("Another desk on a taken day")}
    </LegendItem>
  </ul>
)

const LegendItem = ({
  swatch,
  icon,
  children,
}: {
  swatch: string
  icon?: ReactNode
  children: ReactNode
}) => (
  <li className="flex items-center gap-2">
    <span className={clsx("grid size-3.5 shrink-0 place-items-center rounded-[4px]", swatch)}>
      {icon}
    </span>
    {children}
  </li>
)
