import { useCallback, useMemo } from "react"
import { isSeatable } from "./catalog"
import { ZONE_FILTER_PREFIX } from "./zones"
import { useEditorStore } from "~/editor/store"
import { type SceneObject } from "~/editor/types"
import { addDays, deskState, weekStart, type Day, type DeskState } from "~/utils/booking"
import type { Translator } from "~/i18n/translate"

export interface DeskOnDay {
  desk: SceneObject
  state: DeskState
}

/** "Desk B2", or just "Desk" for an unlabelled one. */
export const deskName = ({ t }: Translator, desk: Pick<SceneObject, "label">) =>
  desk.label ? t("Desk {label}", { label: desk.label }) : t("Desk")

/** "today", or "on Wed 23 Sep". */
export const dayPhrase = ({ t, format }: Translator, day: string, today: string) =>
  day === today ? t("today") : format.onDay(day)

/**
 * Every desk with who has it on the shown day (resident, booking or free),
 * plus the same keyed by person. Without booking (standalone editor) only
 * permanent residents count.
 */
export const useDesksOnDay = () => {
  const objects = useEditorStore((state) => state.objects)
  const day = useEditorStore((state) => state.booking.day)
  const byDay = useEditorStore((state) => state.booking.byDay)
  const released = useEditorStore((state) => state.booking.released)
  return useMemo(() => {
    const desks: DeskOnDay[] = objects
      .filter((piece) => isSeatable(piece.type))
      .map((desk) => ({ desk, state: deskState(desk, day, byDay, released) }))
    const byPerson = new Map<string, DeskOnDay>()
    for (const entry of desks)
      if (entry.state.kind !== "free") byPerson.set(entry.state.email, entry)
    return { desks, byPerson }
  }, [objects, day, byDay, released])
}

/**
 * The map's desk filter: whether a desk has every feature asked for
 * (DESK_FEATURES ids) and, when zones are picked, is in one of them. No
 * filter: every desk matches.
 */
export const useDeskFilter = () => {
  const filter = useEditorStore((state) => state.deskFilter)
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
  const objects = useEditorStore((state) => state.objects)
  const day = useEditorStore((state) => state.booking.day)
  const released = useEditorStore((state) => state.booking.released)
  return email
    ? objects.find((piece) => piece.assignee === email && released[day]?.[piece.id] === email)
    : undefined
}

/** Mon–Fri of the shown day's week, and whether someone has a desk on each day. */
export const useWeekPresence = () => {
  const objects = useEditorStore((state) => state.objects)
  const day = useEditorStore((state) => state.booking.day)
  const byDay = useEditorStore((state) => state.booking.byDay)
  const released = useEditorStore((state) => state.booking.released)
  return useMemo(() => {
    // No day yet (booking not set up — standalone, or the first render).
    if (!day) return { days: [] as Day[], isIn: () => false }
    const monday = weekStart(day)
    const days: Day[] = [0, 1, 2, 3, 4].map((i) => addDays(monday, i))
    const desks = objects.filter((piece) => isSeatable(piece.type))
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
  }, [objects, day, byDay, released])
}

/**
 * The waitlist for the shown day: is the office full (no free desk), are you
 * without a desk and could wait, are you waiting, and how many are — plus
 * join / leave. Nothing to wait for in the past or with a permanent desk.
 */
export const useWaitlist = () => {
  const { desks, byPerson } = useDesksOnDay()
  const enabled = useEditorStore((state) => state.booking.enabled)
  const me = useEditorStore((state) => state.booking.me)
  const day = useEditorStore((state) => state.booking.day)
  const today = useEditorStore((state) => state.booking.today)
  const preferences = useEditorStore((state) => state.booking.preferences)
  const setPreference = useEditorStore((state) => state.booking.setPreference)
  const objects = useEditorStore((state) => state.objects)
  const isResident = !!me && objects.some((piece) => piece.assignee === me)
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
