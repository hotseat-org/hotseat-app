import { useCallback, useMemo } from "react"
import { useEditorStore } from "./store"
import { isSeatable, type SceneObject } from "./types"
import { ZONE_FILTER_PREFIX } from "./zones"
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
  const objects = useEditorStore((s) => s.objects)
  const day = useEditorStore((s) => s.booking.day)
  const byDay = useEditorStore((s) => s.booking.byDay)
  const released = useEditorStore((s) => s.booking.released)
  return useMemo(() => {
    const desks: DeskOnDay[] = objects
      .filter((o) => isSeatable(o.type))
      .map((desk) => ({ desk, state: deskState(desk, day, byDay, released) }))
    const byPerson = new Map<string, DeskOnDay>()
    for (const d of desks) if (d.state.kind !== "free") byPerson.set(d.state.email, d)
    return { desks, byPerson }
  }, [objects, day, byDay, released])
}

/**
 * The map's desk filter: whether a desk has every feature asked for
 * (DESK_FEATURES ids) and, when zones are picked, is in one of them. No
 * filter: every desk matches.
 */
export const useDeskFilter = () => {
  const filter = useEditorStore((s) => s.deskFilter)
  return useCallback(
    (desk: Pick<SceneObject, "features" | "zone">) => {
      const zones = filter.filter((f) => f.startsWith(ZONE_FILTER_PREFIX))
      if (zones.length && !zones.includes(`${ZONE_FILTER_PREFIX}${desk.zone}`)) return false
      return filter
        .filter((f) => !f.startsWith(ZONE_FILTER_PREFIX))
        .every((f) => desk.features?.includes(f))
    },
    [filter]
  )
}

/** Your permanent desk, when you gave it up on the shown day (you're away). */
export const useGivenUpDesk = (email?: string) => {
  const objects = useEditorStore((s) => s.objects)
  const day = useEditorStore((s) => s.booking.day)
  const released = useEditorStore((s) => s.booking.released)
  return email
    ? objects.find((o) => o.assignee === email && released[day]?.[o.id] === email)
    : undefined
}

/** Mon–Fri of the shown day's week, and whether someone has a desk on each day. */
export const useWeekPresence = () => {
  const objects = useEditorStore((s) => s.objects)
  const day = useEditorStore((s) => s.booking.day)
  const byDay = useEditorStore((s) => s.booking.byDay)
  const released = useEditorStore((s) => s.booking.released)
  return useMemo(() => {
    // No day yet (booking not set up — standalone, or the first render).
    if (!day) return { days: [] as Day[], isIn: () => false }
    const monday = weekStart(day)
    const days: Day[] = [0, 1, 2, 3, 4].map((i) => addDays(monday, i))
    const desks = objects.filter((o) => isSeatable(o.type))
    const present = new Map(
      days.map((d) => [
        d,
        new Set(
          desks.flatMap((desk) => {
            const state = deskState(desk, d, byDay, released)
            return state.kind === "free" ? [] : [state.email]
          })
        ),
      ])
    )
    return { days, isIn: (email: string, d: Day) => present.get(d)?.has(email) ?? false }
  }, [objects, day, byDay, released])
}

/**
 * The waitlist for the shown day: is the office full (no free desk), are you
 * without a desk and could wait, are you waiting, and how many are — plus
 * join / leave. Nothing to wait for in the past or with a permanent desk.
 */
export const useWaitlist = () => {
  const { desks, byPerson } = useDesksOnDay()
  const enabled = useEditorStore((s) => s.booking.enabled)
  const me = useEditorStore((s) => s.booking.me)
  const day = useEditorStore((s) => s.booking.day)
  const today = useEditorStore((s) => s.booking.today)
  const preferences = useEditorStore((s) => s.booking.preferences)
  const setPreference = useEditorStore((s) => s.booking.setPreference)
  const objects = useEditorStore((s) => s.objects)
  const isResident = !!me && objects.some((o) => o.assignee === me)
  const isFull =
    enabled && day >= today && desks.length > 0 && !desks.some((d) => d.state.kind === "free")
  const isWaiting = preferences.waiting.includes(day)
  return {
    canWait: isFull && !!me && !byPerson.has(me) && !isResident && !isWaiting,
    isWaiting,
    count: preferences.waitingByDay[day] ?? 0,
    join: () => setPreference({ intent: "waitlist-join", dates: JSON.stringify([day]) }),
    leave: () => setPreference({ intent: "waitlist-leave", dates: JSON.stringify([day]) }),
  }
}
