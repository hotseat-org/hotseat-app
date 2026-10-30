import { Modal } from "@heroui/react"
import clsx from "clsx"
import { Armchair, ArrowLeftRight, Check, X } from "lucide-react"
import { deskName } from "../useBooking"
import { PICK_ALL, PICK_ALL_OFF, PICK_ALL_ON, getDayLook, type Cell, type Week } from "./days"
import { type SceneObject } from "~/editor/types"
import { type Day } from "~/utils/booking"
import type { Translator } from "~/i18n/translate"

/**
 * Phones: week by week. Each week is a row of Mon–Fri (narrow Sat/Sun at the
 * end) under its number and a "Whole week" toggle; "Every Mon…" chips pick a
 * weekday in every week. Clear + one big Reserve at the bottom.
 */
export const PhoneLayout = ({
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
              aria-label={t("Week {week}", { week: week.number })}
              className="flex flex-col gap-2"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-extrabold">
                  {t("W{week}", { week: week.number })}{" "}
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
  const getBadge = () => {
    if (isMove) {
      return {
        look: "bg-warning text-warning-foreground",
        mark: <ArrowLeftRight strokeWidth={2.6} />,
      }
    }
    if (isElsewhere)
      return { look: "bg-overlay text-foreground", mark: <Armchair strokeWidth={2.4} /> }
    if (isPicked && cell.kind === "free") {
      return { look: "bg-overlay text-accent", mark: <Check strokeWidth={3.5} /> }
    }
    // Whose it is, by initial.
    if (cell.kind === "taken") return { look: "bg-muted text-background", mark: cell.holder[0] }

    return undefined
  }
  const badge = getBadge()

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
