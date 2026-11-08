import { useEffect, useState } from "react"
import { personByEmail, usePeople } from "../../desks/people"
import { deskName } from "../useBooking"
import { DESK_FEATURES } from "../../desks/deskFeatures"
import { isSeatable } from "../../catalog"
import { useOfficeStore } from "../../store"
import { composeDeskFacts } from "./deskFacts"
import type { BodyProps } from "./SeatCardBody"
import { bookingPresets, deskState, isOpenDay, type BookingPreset, type Day } from "~/utils/booking"
import { getKeepingTeam, getOpensToEveryoneOn } from "~/utils/teams"
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
  const card = useOfficeStore((editorState) => editorState.seatCard)
  const objects = useOfficeStore((editorState) => editorState.objects)
  const booking = useOfficeStore((editorState) => editorState.booking)
  const closeSeatCard = useOfficeStore((editorState) => editorState.closeSeatCard)
  const applyReserve = useOfficeStore((editorState) => editorState.applyReserve)
  const applyCancel = useOfficeStore((editorState) => editorState.applyCancel)
  const openCustomBooking = useOfficeStore((editorState) => editorState.openCustomBooking)
  const showRoute = useOfficeStore((editorState) => editorState.showRoute)
  const applyFavorite = useOfficeStore((editorState) => editorState.applyFavorite)
  const showPerson = useOfficeStore((editorState) => editorState.showPerson)
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
  const { day, today, lastDay, byDay, released, opening } = booking
  const getState = () => {
    if (booking.enabled) return deskState(seat, day, byDay, released)
    if (seat.assignee) return { kind: "resident", email: seat.assignee } as const

    return { kind: "free" } as const
  }
  const state = getState()
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
      const presets = bookingPresets(day, today, lastDay, opening)
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

  /** The team its zone is kept for, that day, if you're not in it (none: you can book it). */
  const getKeptFor = (date: Day) =>
    me ? getKeepingTeam(booking.teams, { zone: seat.zone, day: date, today, email: me }) : null

  // Quick choices, for a bookable desk someone could still take.
  let options: Option[] = []
  let note: string | undefined
  if (isMyDesk) {
    if (state.kind === "booked")
      note = t("You gave {day} up, and it's been booked.", { day: format.short(day) })
    else if (state.kind === "free")
      note = t("You gave {day} up — others can book it.", { day: format.short(day) })
  } else if (booking.enabled && !past && !isOpenDay(day, opening)) {
    // The office is closed that day: nothing to book (other days still are, from the day picker).
    const reason = opening.closedDays[day]
    note = reason
      ? t("The office is closed on {day} ({reason}).", { day: format.short(day), reason })
      : t("The office is closed on {day}.", { day: format.short(day) })
  } else if (booking.enabled && me && state.kind === "free" && !past && getKeptFor(day)) {
    // Its zone is kept for a team you're not in: bookable from shortly before.
    const team = getKeptFor(day)!
    note = t("Kept for {team}: you can book it from {day}.", {
      team: team.name,
      day: format.short(getOpensToEveryoneOn(team, day)),
    })
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
      const presets = bookingPresets(day, today, lastDay, opening)
      const describe = (days: Day[]) => {
        const free = days.filter(
          (date) => deskState(seat, date, byDay, released).kind === "free" && !getKeptFor(date)
        )
        const taken = days.flatMap((date) => {
          const dayState = deskState(seat, date, byDay, released)

          return dayState.kind === "booked" && dayState.email !== me
            ? [
                `${format.dow(date)} ${personByEmail(people, dayState.email)?.name.split(" ")[0] ?? t("taken")}`,
              ]
            : []
        })
        const getAvailability = () => {
          if (taken.length) {
            return `${t("{free} of {total} free", { free: free.length, total: days.length })} · ${taken.join(", ")}`
          }
          if (free.length !== days.length) return t("Some are already yours")
          if (days.length === 1) return t("Free")

          return tn(days.length, "All {n} day free", "All {n} days free")
        }
        const detail = getAvailability()
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

  // Who's next to it that day, whose corner it is: for a desk you could sit at.
  const canSitHere = booking.enabled && !past && (state.kind === "free" || mine)
  const getFirstName = (email: string) => personByEmail(people, email)?.name.split(" ")[0]
  const facts = canSitHere
    ? composeDeskFacts(i18n, {
        seat,
        desks: objects
          .filter((piece) => isSeatable(piece.type))
          .map((desk) => {
            const deskOnDay = deskState(desk, day, byDay, released)
            const isSomeoneElse = deskOnDay.kind !== "free" && deskOnDay.email !== me

            return { desk, name: isSomeoneElse ? getFirstName(deskOnDay.email) : undefined }
          }),
        teamName: booking.teams.find((team) => seat.zone && team.zone === seat.zone)?.name,
      })
    : []

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
    onShowPerson: person && showPerson ? () => showPerson(person.email) : undefined,
    mine,
    past,
    facts,
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
