import { Button } from "@heroui/react"
import { ArrowRight, CalendarX2, Undo2 } from "lucide-react"
import { initials, personByEmail, usePeople } from "../desks/people"
import type { Rehoming, UpcomingBooking } from "~/core/office/layoutImpact"
import { useI18n } from "~/i18n/I18nProvider"

/** Rows shown before "and n more". */
const MAX_ROWS = 6

interface Props {
  moves: Rehoming<UpcomingBooking>[]
  /** A desk's label in the layout as saved (where the booking is now). */
  labelOf: (deskId: string) => string | undefined
  onMove: () => void
  onCancel: () => void
  onUndo: () => void
}

/**
 * Shown when an edit would take desks away from people who've booked them
 * (a desk removed, or made someone's permanent desk): the layout isn't saved
 * until the admin chooses — move those bookings to the nearest free desks,
 * cancel them, or undo the change. Who's affected, and where each would go.
 */
export const LayoutImpact = ({ moves, labelOf, onMove, onCancel, onUndo }: Props) => {
  const { t, tn, format } = useI18n()
  const people = usePeople()
  const movable = moves.filter((move) => move.to).length
  const nameOf = (email: string) => personByEmail(people, email)?.name ?? email.split("@")[0]

  return (
    <div
      role="alertdialog"
      aria-labelledby="layout-impact-title"
      className="pointer-events-auto w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-warning/40 bg-overlay p-4 text-foreground shadow-overlay"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-warning/15 text-warning">
          <CalendarX2 className="size-[18px]" />
        </span>
        <div className="min-w-0">
          <h2 id="layout-impact-title" className="text-sm font-extrabold">
            {tn(
              moves.length,
              "This change takes away {n} booking",
              "This change takes away {n} bookings"
            )}
          </h2>
          <p className="text-xs text-muted">{t("Not saved yet. Choose what happens to them:")}</p>
        </div>
      </div>

      <ul className="mt-3 flex flex-col gap-1.5">
        {moves.slice(0, MAX_ROWS).map(({ booking, to }) => {
          const person = personByEmail(people, booking.userEmail)

          return (
            <li
              key={`${booking.userEmail}|${booking.date}`}
              className="flex items-center gap-2 rounded-xl bg-foreground/[0.04] px-2 py-1.5 text-xs"
            >
              {person?.avatarUrl ? (
                <img
                  src={person.avatarUrl}
                  alt=""
                  className="size-6 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent/15 text-[10px] font-bold text-accent">
                  {initials(nameOf(booking.userEmail))}
                </span>
              )}
              <span className="min-w-0 flex-1 truncate">
                <span className="font-semibold">{nameOf(booking.userEmail)}</span>
                <span className="text-muted">
                  {" · "}
                  {format.short(booking.date)}
                  {labelOf(booking.deskId) ? ` · ${labelOf(booking.deskId)}` : ""}
                </span>
              </span>
              {to ? (
                <span className="flex shrink-0 items-center gap-1 font-semibold text-success">
                  <ArrowRight className="size-3" />
                  {to.label ?? t("a desk")}
                </span>
              ) : (
                <span className="shrink-0 text-muted">{t("no free desk")}</span>
              )}
            </li>
          )
        })}
      </ul>
      {moves.length > MAX_ROWS && (
        <p className="mt-1.5 px-1 text-xs text-muted">
          {tn(moves.length - MAX_ROWS, "and {n} more", "and {n} more")}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {movable > 0 && (
          <Button size="sm" variant="primary" onPress={onMove}>
            {tn(movable, "Move {n} to a free desk", "Move {n} to free desks")}
          </Button>
        )}
        <Button size="sm" variant="danger-soft" onPress={onCancel}>
          {movable > 0 ? t("Cancel them all") : t("Cancel them")}
        </Button>
        <Button size="sm" variant="tertiary" onPress={onUndo}>
          <Undo2 className="size-4" />
          {t("Undo")}
        </Button>
      </div>
      <p className="mt-2 text-[11px] text-muted">{t("Everyone affected is told what happened.")}</p>
    </div>
  )
}
