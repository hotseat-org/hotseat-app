import { useMemo } from "react"
import { useEditorStore } from "./store"
import { isSeatable, type SceneObject } from "./types"
import { deskState, formatShort, type DeskState } from "~/utils/booking"

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
  return useMemo(() => {
    const desks: DeskOnDay[] = objects
      .filter((o) => isSeatable(o.type))
      .map((desk) => ({ desk, state: deskState(desk, day, byDay) }))
    const byPerson = new Map<string, DeskOnDay>()
    for (const d of desks) if (d.state.kind !== "free") byPerson.set(d.state.email, d)
    return { desks, byPerson }
  }, [objects, day, byDay])
}
