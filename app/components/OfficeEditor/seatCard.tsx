import { Button, CloseButton } from "@heroui/react"
import clsx from "clsx"
import {
  Armchair,
  CalendarDays,
  CalendarX,
  Check,
  ChevronRight,
  LogOut,
  Pin,
  Undo2,
} from "lucide-react"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { useEditorStore } from "./store"
import { personByEmail, usePeople, type Person } from "./people"
import { deskName } from "./useBooking"
import { MemberAvatar } from "~/components/office/shell-ui"
import {
  bookingPresets,
  deskState,
  formatDow,
  formatLong,
  formatShort,
  formatWeekday,
  type BookingPreset,
  type Day,
} from "~/utils/booking"

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
  const card = useEditorStore((s) => s.seatCard)
  const objects = useEditorStore((s) => s.objects)
  const booking = useEditorStore((s) => s.booking)
  const closeSeatCard = useEditorStore((s) => s.closeSeatCard)
  const applyReserve = useEditorStore((s) => s.applyReserve)
  const applyCancel = useEditorStore((s) => s.applyCancel)
  const openCustomBooking = useEditorStore((s) => s.openCustomBooking)
  const people = usePeople()
  const [closing, setClosing] = useState(false)
  const seat = card ? objects.find((o) => o.id === card.id) : undefined

  // A new desk (or reopening) starts fresh.
  useEffect(() => setClosing(false), [card?.id])

  // Animate out, then drop the card.
  const close = () => {
    setClosing(true)
    window.setTimeout(closeSeatCard, EXIT_MS)
  }

  useEffect(() => {
    if (!card) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close()
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
  const myResidentDesk = me ? objects.find((o) => o.assignee === me && o.id !== seat.id) : undefined
  // Your own permanent desk: give it up on days away, or take a day back.
  const isMyDesk = booking.enabled && !!me && seat.assignee === me
  const isGivenUp = (d: Day) => released[d]?.[seat.id] === me
  let releaseChoices: { label: string; days: Day[] }[] = []
  let canReclaim = false
  if (isMyDesk && !past) {
    if (isGivenUp(day)) canReclaim = state.kind === "free"
    else {
      const presets = bookingPresets(day, today, lastDay)
      releaseChoices = [
        { label: `Just ${formatShort(day)}`, days: presets.one },
        { label: `Rest of the week (${formatDow(day)}–Fri)`, days: presets.week },
      ]
        .map((c) => ({ ...c, days: c.days.filter((d) => !isGivenUp(d)) }))
        .filter((c, i) => c.days.length > 0 && (i === 0 || c.days.length > 1))
    }
  }

  // Quick choices, for a bookable desk someone could still take.
  let options: Option[] = []
  let note: string | undefined
  if (isMyDesk) {
    if (state.kind === "booked") note = `You gave ${formatShort(day)} up, and it's been booked.`
    else if (state.kind === "free") note = `You gave ${formatShort(day)} up — others can book it.`
  } else if (booking.enabled && me && state.kind !== "resident" && !past && !mine) {
    if (seat.assignee)
      note = `${personByEmail(people, seat.assignee)?.name ?? "Someone"}'s permanent desk — free on the days they're away.`
    if (myResidentDesk)
      note = `You have a permanent desk here (${deskName(myResidentDesk)}), so you can't book another.`
    else {
      const presets = bookingPresets(day, today, lastDay)
      const describe = (days: Day[]) => {
        const free = days.filter((d) => deskState(seat, d, byDay, released).kind === "free")
        const taken = days.flatMap((d) => {
          const st = deskState(seat, d, byDay, released)
          return st.kind === "booked" && st.email !== me
            ? [`${formatDow(d)} ${personByEmail(people, st.email)?.name.split(" ")[0] ?? "taken"}`]
            : []
        })
        const detail = taken.length
          ? `${free.length} of ${days.length} free · ${taken.join(", ")}`
          : free.length === days.length
            ? days.length === 1
              ? "Free"
              : `All ${days.length} days free`
            : "Some are already yours"
        // Booking moves you: say so when you already sit elsewhere on those days.
        const moves = free.some((d) => Object.values(byDay[d] ?? {}).includes(me))
        return { free, detail: moves ? `${detail} · moves you here` : detail }
      }
      const all: [BookingPreset, string][] = [
        ["one", `Just ${formatShort(day)}`],
        ["week", `Rest of the week (${formatDow(day)}–Fri)`],
        ["every", `Every ${formatWeekday(day)}`],
      ]
      options = all
        // A preset that's the same as a shorter one adds nothing.
        .filter(([key]) => key === "one" || presets[key].length > 1)
        .map(([key, title]) => {
          const { free, detail } = describe(presets[key])
          return {
            key,
            title,
            detail:
              key === "every"
                ? `Until ${formatLong(presets.every[presets.every.length - 1])} · ${detail}`
                : detail,
            free,
          }
        })
        .filter((o) => o.free.length > 0 || o.key !== "one")
    }
  }

  const body: BodyProps = {
    title: deskName(seat),
    dayLabel: booking.enabled ? formatLong(day) : undefined,
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
  title: string
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
  onCancel: () => void
  onRelease: (days: Day[]) => void
  onReclaim: () => void
}

const stop = (e: { stopPropagation: () => void }) => e.stopPropagation()

/**
 * The card itself — plain props only (the 3D view renders it in drei's separate
 * root). Anchored over its desk, or on phones a bottom sheet (`layout="sheet"`):
 * the same content, full width, with bigger targets.
 */
export const SeatCardBody = ({
  layout = "anchored",
  title,
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
  onCancel,
  onRelease,
  onReclaim,
}: BodyProps & { layout?: "anchored" | "sheet" }) => {
  const isSheet = layout === "sheet"
  const [choice, setChoice] = useState<BookingPreset | undefined>(
    () => options.find((o) => o.free.length > 0)?.key
  )
  const picked = options.find((o) => o.key === choice && o.free.length > 0)

  // Above the desk by default; a desk near the top of the screen gets the card
  // below it instead, so it's never cut off. Decided once, before paint.
  const ref = useRef<HTMLDivElement>(null)
  const [below, setBelow] = useState(false)
  useLayoutEffect(() => {
    const top = ref.current?.getBoundingClientRect().top ?? 0
    if (!isSheet && top < 8) setBelow(true)
  }, [isSheet])

  return (
    // Centred on the anchor, lifted a little; the inner box animates.
    // Click-through: only the controls take the pointer — the card body sits
    // over the desks BEHIND this one (isometric), and must not block them.
    <div
      ref={ref}
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
                "w-full gap-3.5 rounded-t-3xl border-t border-border bg-overlay px-5 pb-7 pt-2.5 shadow-overlay",
                closing ? "sheet-down" : "sheet-up"
              )
            : clsx(
                "w-64 gap-2.5 rounded-2xl border border-border bg-overlay/95 p-3 shadow-overlay backdrop-blur-md",
                below ? "origin-top" : "origin-bottom",
                closing ? "seat-pop-out" : "seat-pop"
              )
        )}
      >
        {isSheet && <span aria-hidden className="mx-auto h-1.5 w-10 rounded-full bg-border" />}
        <div className="flex items-center justify-between">
          <p
            className={clsx(
              "flex items-center gap-1.5 font-extrabold",
              isSheet ? "text-lg" : "text-sm"
            )}
          >
            <Armchair className={clsx("text-accent", isSheet ? "size-5" : "size-4")} />
            {title}
          </p>
          <CloseButton
            aria-label="Close"
            onPress={onClose}
            className={isSheet ? "size-10" : undefined}
          />
        </div>

        {/* Who has it on the shown day. */}
        <div
          className={clsx(
            "flex items-center gap-2.5 rounded-xl p-2",
            mine ? "bg-accent/12" : state === "free" ? "bg-success/12" : "bg-surface-secondary"
          )}
        >
          {person ? (
            <MemberAvatar
              m={{
                userEmail: person.email,
                displayName: person.name,
                avatarUrl: person.avatarUrl,
                role: "",
              }}
              className="size-9 shrink-0 rounded-full"
            />
          ) : (
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-success text-success-foreground">
              <Check className="size-4" strokeWidth={3} />
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {person ? (mine ? "You" : person.name) : "Free"}
            </p>
            <p className="flex items-center gap-1 truncate text-xs text-muted">
              {state === "resident" ? (
                <>
                  <Pin className="size-3" /> Permanent desk
                </>
              ) : (
                (dayLabel ?? "Free desk")
              )}
            </p>
          </div>
        </div>

        {past && <p className="text-xs text-muted">Past days can&apos;t be changed.</p>}
        {note && <p className="text-xs text-muted">{note}</p>}

        {options.length > 0 && (
          <>
            {state === "booked" && !mine && (
              <p className="text-[0.64rem] font-black uppercase tracking-wider text-muted">
                Book it on other days
              </p>
            )}
            <div role="radiogroup" aria-label="Which days" className="flex flex-col gap-1.5">
              {options.map((o) => {
                const on = o.key === choice
                const disabled = o.free.length === 0
                return (
                  <button
                    key={o.key}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    disabled={disabled}
                    onClick={() => setChoice(o.key)}
                    className={clsx(
                      "flex items-start gap-2.5 rounded-xl border-[1.5px] px-2.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus",
                      isSheet ? "py-3" : "py-2",
                      on ? "border-accent bg-accent/10" : "border-border bg-surface",
                      disabled ? "opacity-50" : !on && "hover:border-muted"
                    )}
                  >
                    <span
                      className={clsx(
                        "mt-0.5 size-4 shrink-0 rounded-full",
                        on ? "border-[5px] border-accent" : "border-2 border-muted"
                      )}
                    />
                    <span className="min-w-0">
                      <span className="block text-[0.8rem] font-bold leading-tight">{o.title}</span>
                      <span className="block text-[0.7rem] text-muted">{o.detail}</span>
                    </span>
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              onClick={onCustom}
              className={clsx(
                "flex items-center gap-2.5 rounded-xl border-[1.5px] border-dashed border-border px-2.5 text-left outline-none transition-colors hover:border-muted focus-visible:ring-2 focus-visible:ring-focus",
                isSheet ? "py-3" : "py-2"
              )}
            >
              <CalendarDays className="size-4 shrink-0 text-accent" />
              <span className="min-w-0 flex-1">
                <span className="block text-[0.8rem] font-bold leading-tight">Custom…</span>
                <span className="block text-[0.7rem] text-muted">Pick any days on a calendar</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted" />
            </button>
            <Button
              size={isSheet ? "lg" : "sm"}
              variant="primary"
              className="w-full"
              isDisabled={!picked || pending}
              onPress={() => picked && onReserve(picked.free)}
            >
              <Check className="size-4" strokeWidth={2.5} />
              {picked
                ? `Reserve ${picked.free.length} ${picked.free.length === 1 ? "day" : "days"}`
                : "Reserve"}
            </Button>
          </>
        )}

        {canCancel && (
          <Button
            size={isSheet ? "lg" : "sm"}
            variant="secondary"
            className="w-full"
            isDisabled={pending}
            onPress={onCancel}
          >
            <LogOut className="size-4" /> Cancel {dayLabel}
          </Button>
        )}

        {releaseChoices.length > 0 && (
          <>
            <p className="text-[0.64rem] font-black uppercase tracking-wider text-muted">
              Away? Let others book it
            </p>
            <div className="flex flex-col gap-1.5">
              {releaseChoices.map((c) => (
                <Button
                  key={c.label}
                  size={isSheet ? "lg" : "sm"}
                  variant="secondary"
                  className="w-full justify-start"
                  isDisabled={pending}
                  onPress={() => onRelease(c.days)}
                >
                  <CalendarX className="size-4" /> {c.label}
                </Button>
              ))}
            </div>
          </>
        )}

        {canReclaim && (
          <Button
            size={isSheet ? "lg" : "sm"}
            variant="secondary"
            className="w-full"
            isDisabled={pending}
            onPress={onReclaim}
          >
            <Undo2 className="size-4" /> Take {dayLabel} back
          </Button>
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
