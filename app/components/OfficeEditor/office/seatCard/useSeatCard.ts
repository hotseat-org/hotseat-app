import { useEffect, useState } from "react"
import { useEditorStore } from "../../store"
import { personByEmail, usePeople } from "../people"
import { deskName } from "../useBooking"
import { DESK_FEATURES } from "../deskFeatures"
import type { BodyProps } from "./SeatCardBody"
import { bookingPresets, deskState, type BookingPreset, type Day } from "~/utils/booking"
import { useI18n } from "~/i18n/I18nProvider"

/** Must match the `seat-pop-out` animation duration in tailwind.css. */
const EXIT_MS = 140

/** One of the card's quick choices, worked out for this desk. */
export interface Option {
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
