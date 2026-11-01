import { useCallback, useMemo } from "react"
import { isSeatable } from "../catalog"
import { ZONE_FILTER_PREFIX } from "../zones/zones"
import { useOfficeStore } from "../store"
import { useAllPieces, type FloorNote } from "~/editor"
import {
  getFloorId,
  getFloorLabel,
  getFloorTitle,
  type FloorLabel,
  type SceneObject,
} from "~/editor/core"
import { useI18n } from "~/i18n/I18nProvider"
import { addDays, deskState, weekStart, type Day, type DeskState } from "~/utils/booking"
import type { Translator } from "~/i18n/translate"

export interface DeskOnDay {
  desk: SceneObject
  state: DeskState
}

/** "Desk B2", or just "Desk" for an unlabelled one. */
export const deskName = ({ t }: Translator, desk: Pick<SceneObject, "label">) =>
  desk.label ? t("Desk {label}", { label: desk.label }) : t("Desk")

/** A floor's name to show: its own, or (unnamed) "Floor 2". */
export const floorText = ({ t }: Translator, floor: FloorLabel) =>
  floor.name || getFloorTitle({ t }, floor.number)

/** Which floor a desk is on, to show ("Attic") — none in an office of one floor. */
export const useDeskFloor = () => {
  const floors = useOfficeStore((state) => state.floors)
  const i18n = useI18n()

  return useCallback(
    (desk: Pick<SceneObject, "floor">) => {
      const floor = getFloorLabel(floors, desk)

      return floor && floorText(i18n, floor)
    },
    [floors, i18n]
  )
}

/** "today", or "on Wed 23 Sep". */
export const dayPhrase = ({ t, format }: Translator, day: string, today: string) =>
  day === today ? t("today") : format.onDay(day)

/**
 * Every desk in the office (each with its floor) with who has it on the shown
 * day (resident, booking or free), the same keyed by person — and the shown
 * floor's, for what's drawn on the map. Without booking (standalone editor)
 * only permanent residents count.
 */
export const useDesksOnDay = () => {
  const pieces = useAllPieces()
  const currentFloor = useOfficeStore((state) => state.currentFloor)
  const day = useOfficeStore((state) => state.booking.day)
  const byDay = useOfficeStore((state) => state.booking.byDay)
  const released = useOfficeStore((state) => state.booking.released)

  return useMemo(() => {
    const desks: DeskOnDay[] = pieces
      .filter((piece) => isSeatable(piece.type))
      .map((desk) => ({ desk, state: deskState(desk, day, byDay, released) }))
    const byPerson = new Map<string, DeskOnDay>()
    for (const entry of desks)
      if (entry.state.kind !== "free") byPerson.set(entry.state.email, entry)
    const floorDesks = desks.filter((entry) => entry.desk.floor === currentFloor)

    return { desks, byPerson, floorDesks }
  }, [pieces, currentFloor, day, byDay, released])
}

/**
 * The floors' notes on the shown day: how many desks are free on each ("6
 * free", or "Full"), and which has yours. None with one floor, without
 * booking, or on a past day (nothing to book there).
 */
export const useFloorNotes = (): ReadonlyMap<string, FloorNote> | null => {
  const { t, tn } = useI18n()
  const { desks, byPerson } = useDesksOnDay()
  const floors = useOfficeStore((state) => state.floors)
  const isEnabled = useOfficeStore((state) => state.booking.enabled)
  const me = useOfficeStore((state) => state.booking.me)
  const day = useOfficeStore((state) => state.booking.day)
  const today = useOfficeStore((state) => state.booking.today)

  return useMemo(() => {
    if (floors.length < 2 || !isEnabled || day < today) return null

    const mine = me ? byPerson.get(me) : undefined
    const myFloor = mine && getFloorId(mine.desk, floors)
    const notes = new Map<string, FloorNote>()
    for (const floor of floors) {
      const floorDesks = desks.filter((entry) => getFloorId(entry.desk, floors) === floor.id)
      if (!floorDesks.length) continue

      const freeCount = floorDesks.filter((entry) => entry.state.kind === "free").length
      notes.set(floor.id, {
        text: freeCount ? tn(freeCount, "{n} free", "{n} free") : t("Full"),
        tone: freeCount ? "positive" : "warning",
        yours: floor.id === myFloor ? t("your desk") : undefined,
      })
    }

    return notes
  }, [desks, byPerson, floors, isEnabled, me, day, today, t, tn])
}

/**
 * The map's desk filter: whether a desk has every feature asked for
 * (DESK_FEATURES ids) and, when zones are picked, is in one of them. No
 * filter: every desk matches.
 */
export const useDeskFilter = () => {
  const filter = useOfficeStore((state) => state.deskFilter)

  return useCallback(
    (desk: Pick<SceneObject, "features" | "zone">) => {
      const zones = filter.filter((option) => option.startsWith(ZONE_FILTER_PREFIX))
      if (zones.length && !zones.includes(`${ZONE_FILTER_PREFIX}${desk.zone}`)) return false

      return filter
        .filter((option) => !option.startsWith(ZONE_FILTER_PREFIX))
        .every((option) => desk.features?.includes(option))
    },
    [filter]
  )
}

/** Your permanent desk, when you gave it up on the shown day (you're away). */
export const useGivenUpDesk = (email?: string) => {
  const pieces = useAllPieces()
  const day = useOfficeStore((state) => state.booking.day)
  const released = useOfficeStore((state) => state.booking.released)

  return email
    ? pieces.find((piece) => piece.assignee === email && released[day]?.[piece.id] === email)
    : undefined
}

/** Mon–Fri of the shown day's week, and whether someone has a desk on each day. */
export const useWeekPresence = () => {
  const pieces = useAllPieces()
  const day = useOfficeStore((state) => state.booking.day)
  const byDay = useOfficeStore((state) => state.booking.byDay)
  const released = useOfficeStore((state) => state.booking.released)

  return useMemo(() => {
    // No day yet (booking not set up — standalone, or the first render).
    if (!day) return { days: [] as Day[], isIn: () => false }

    const monday = weekStart(day)
    const days: Day[] = [0, 1, 2, 3, 4].map((i) => addDays(monday, i))
    const desks = pieces.filter((piece) => isSeatable(piece.type))
    const present = new Map(
      days.map((date) => [
        date,
        new Set(
          desks.flatMap((desk) => {
            const state = deskState(desk, date, byDay, released)

            return state.kind === "free" ? [] : [state.email]
          })
        ),
      ])
    )

    return { days, isIn: (email: string, date: Day) => present.get(date)?.has(email) ?? false }
  }, [pieces, day, byDay, released])
}

/**
 * The waitlist for the shown day: is the office full (no free desk), are you
 * without a desk and could wait, are you waiting, and how many are — plus
 * join / leave. Nothing to wait for in the past or with a permanent desk.
 */
export const useWaitlist = () => {
  const { desks, byPerson } = useDesksOnDay()
  const enabled = useOfficeStore((state) => state.booking.enabled)
  const me = useOfficeStore((state) => state.booking.me)
  const day = useOfficeStore((state) => state.booking.day)
  const today = useOfficeStore((state) => state.booking.today)
  const preferences = useOfficeStore((state) => state.booking.preferences)
  const setPreference = useOfficeStore((state) => state.booking.setPreference)
  const pieces = useAllPieces()
  const isResident = !!me && pieces.some((piece) => piece.assignee === me)
  const isFull =
    enabled &&
    day >= today &&
    desks.length > 0 &&
    !desks.some((entry) => entry.state.kind === "free")
  const isWaiting = preferences.waiting.includes(day)

  return {
    canWait: isFull && !!me && !byPerson.has(me) && !isResident && !isWaiting,
    isWaiting,
    count: preferences.waitingByDay[day] ?? 0,
    join: () => setPreference({ intent: "waitlist-join", dates: JSON.stringify([day]) }),
    leave: () => setPreference({ intent: "waitlist-leave", dates: JSON.stringify([day]) }),
  }
}
