import { Tooltip } from "@heroui/react"
import clsx from "clsx"
import { Armchair, ArrowLeftRight, Check } from "lucide-react"
import { type ReactNode } from "react"
import { deskName } from "../useBooking"
import { type SceneObject } from "~/editor/core"
import { type Day } from "~/utils/booking"
import type { Translator } from "~/i18n/translate"

/** What one calendar day means for the desk being booked. */
export type Cell =
  | { kind: "closed"; day: Day; label: string }
  | { kind: "yours"; day: Day }
  | { kind: "free"; day: Day; isWeekend: boolean; currentDesk?: SceneObject }
  | { kind: "taken"; day: Day; holder: string; alternative?: SceneObject }

/**
 * The weekday headings and week numbers pick a whole column / row, so they
 * look like buttons: a tinted chip with an arrow toward what they pick, solid
 * accent once all of it is picked.
 */
export const PICK_ALL =
  "border-[1.5px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus"

export const PICK_ALL_OFF =
  "border-border bg-surface-secondary text-foreground hover:border-accent hover:bg-accent/10 hover:text-accent"

export const PICK_ALL_ON = "border-accent bg-accent text-accent-foreground"

/** A weekday heading: Mon, Tue… */
export const WEEKDAY = "text-center text-[11px] font-extrabold uppercase tracking-[0.08em]"

/** The footer's pill buttons, as in the mockup: 44px tall, 15px bold. */
export const FOOTER_BUTTON =
  "flex h-11 items-center rounded-full text-[15px] font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50"

/** Week number + Mon–Sun, square 68px days. */
export const GRID = "grid grid-cols-[40px_repeat(7,68px)] gap-1.5"

export const WithTooltip = ({ tip: tooltip, children }: { tip?: string; children: ReactNode }) =>
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

interface Look {
  label: string
  tooltip?: string
  tone: string
}

/** Someone else's day: their name, or (once picked) the nearest free desk instead. */
const getTakenLook = (
  i18n: Translator,
  cell: Extract<Cell, { kind: "taken" }>,
  isPicked: boolean
): Look => {
  const { t, format } = i18n
  const when = format.onDay(cell.day)
  const { holder } = cell
  const tone = isPicked
    ? "border-transparent bg-accent/55 text-foreground"
    : "border-transparent bg-surface-tertiary text-muted"
  if (!cell.alternative) {
    return { label: holder, tooltip: t("{holder} has this desk {when}.", { holder, when }), tone }
  }

  const alternative = deskName(i18n, cell.alternative)
  if (isPicked) {
    return {
      label: alternative,
      tooltip: t(
        "{holder} has this desk {when}, so you get {alternative}, the nearest free desk. Tap to drop the day.",
        { holder, when, alternative }
      ),
      tone,
    }
  }

  return {
    label: holder,
    tooltip: t(
      "{holder} has this desk {when}. Tap to book {alternative}, the nearest free desk, instead.",
      { holder, when, alternative }
    ),
    tone,
  }
}

const getFreeTone = (isPicked: boolean, isMove: boolean, isWeekend: boolean) => {
  if (isPicked) {
    return isMove
      ? "border-transparent bg-[color-mix(in_oklab,var(--accent)_72%,black)] text-accent-foreground"
      : "border-transparent bg-accent text-accent-foreground"
  }
  if (isMove) return "border-warning bg-warning/15 text-foreground"

  return clsx("border-border bg-surface", isWeekend && "text-muted")
}

/** A free day: plain, or (when you sit elsewhere that day) a move to this desk. */
const getFreeLook = (
  i18n: Translator,
  cell: Extract<Cell, { kind: "free" }>,
  isPicked: boolean
): Look => {
  const { t, format } = i18n
  const when = format.onDay(cell.day)
  const isMove = !!cell.currentDesk
  const current = cell.currentDesk ? deskName(i18n, cell.currentDesk) : undefined
  const tone = getFreeTone(isPicked, isMove, cell.isWeekend)
  // Plain days need no words: the colour (and a check when picked) says it.
  if (!current) return { label: "", tone }

  return {
    label: isPicked ? t("Moves you") : current,
    tooltip: isPicked
      ? t("You sit at {desk} {when}. Booking moves you here.", { desk: current, when })
      : t("You sit at {desk} {when}. Picking it moves you here.", { desk: current, when }),
    tone,
  }
}

const getCellLook = (i18n: Translator, cell: Cell, isPicked: boolean): Look => {
  const { t, format } = i18n
  if (cell.kind === "closed") return { label: cell.label, tone: "border-transparent text-muted/60" }
  if (cell.kind === "yours") {
    return {
      label: t("Yours"),
      tooltip: t("You already have this desk {when}.", { when: format.onDay(cell.day) }),
      tone: "border-dashed border-accent bg-accent/8 text-accent",
    }
  }

  return cell.kind === "taken"
    ? getTakenLook(i18n, cell, isPicked)
    : getFreeLook(i18n, cell, isPicked)
}

/** How a day reads: its label, tooltip/explanation, colours and corner mark. */
export const getDayLook = (i18n: Translator, cell: Cell, isPicked: boolean) => {
  const { t, format } = i18n
  const isMove = cell.kind === "free" && !!cell.currentDesk
  const isElsewhere = cell.kind === "taken" && isPicked
  const { label, tooltip, tone } = getCellLook(i18n, cell, isPicked)

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

export const DayCell = ({
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

export interface Week {
  start: Day
  number: number
  cells: Cell[]
}
