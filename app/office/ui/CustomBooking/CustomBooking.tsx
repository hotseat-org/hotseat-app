import { Modal } from "@heroui/react"
import clsx from "clsx"
import { Armchair, ArrowDown, ArrowRight, Check, X } from "lucide-react"
import { useMemo, useState } from "react"
import { personByEmail, usePeople } from "../../people"
import { isSeatable } from "../../catalog"
import { deskName } from "../../useBooking"
import {
  DayCell,
  FOOTER_BUTTON,
  GRID,
  PICK_ALL,
  PICK_ALL_OFF,
  PICK_ALL_ON,
  WEEKDAY,
  WithTooltip,
  type Cell,
} from "./days"
import { Legend } from "./Legend"
import { findNearestFreeDesk } from "./nearestFreeDesk"
import { PhoneLayout } from "./PhoneLayout"
import { type SceneObject } from "~/editor/types"
import { useEditorStore } from "~/editor/store"
import { useI18n } from "~/i18n/I18nProvider"
import {
  addDays,
  deskState,
  isWeekend,
  weekNumber,
  weekStart,
  type Day,
  type DeskDays,
} from "~/utils/booking"
import { useIsMobile } from "~/utils/hooks/useIsMobile"

/** "Every Wednesday" in a sentence: "every Wednesday" / "každou středu". */
const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1)

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
        : findNearestFreeDesk(desk, { desks, day, byDay, released })

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
                ? t("Clear week {week}", { week: week.number })
                : t("Pick all of week {week}", { week: week.number })

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
                      {t("W{week}", { week: week.number })}
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
