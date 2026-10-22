import { useMemo } from "react"
import { useEditorStore } from "./store"
import { isSeatable, type SceneObject } from "./types"
import {
  addDays,
  deskState,
  formatShort,
  weekStart,
  type Day,
  type DeskState,
} from "~/utils/booking"

export interface DeskOnDay {
  desk: SceneObject
  state: DeskState
}

/** "Desk B2", or just "Desk" for an unlabelled one. */
export const deskName = (desk: Pick<SceneObject, "label">) =>
  desk.label ? `Desk ${desk.label}` : "Desk"

/** "today", or "on Wed 23". */
export const dayPhrase = (day: string, today: string) =>
  day === today ? "today" : `on ${formatShort(day)}`

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
