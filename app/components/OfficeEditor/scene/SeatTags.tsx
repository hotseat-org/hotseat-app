import { Html } from "@react-three/drei"
import { Pin } from "lucide-react"
import { useEditorStore } from "../store"
import { initials, personByEmail, usePeople } from "../people"
import { useDesksOnDay } from "../useBooking"

/**
 * View mode: a floating tag over every desk for the shown day: who sits there
 * (a pin marks a permanent resident, you're highlighted), or "Free" when it
 * can still be booked. Without booking (standalone) only labelled or
 * resident desks get a tag.
 */
export const SeatTags = () => {
  const people = usePeople()
  const { desks } = useDesksOnDay()
  const booking = useEditorStore((s) => s.booking.enabled)
  const past = useEditorStore((s) => s.booking.day < s.booking.today)
  // The open desk's card replaces its tag.
  const openId = useEditorStore((s) => s.seatCard?.id)

  return (
    <>
      {desks.map(({ desk, state }) => {
        if (desk.id === openId) return null
        const person = state.kind === "free" ? null : personByEmail(people, state.email)
        const free = state.kind === "free" && booking && !past
        if (!person && !free && !desk.label) return null
        const mine = !!person && person.email === people.me?.email
        return (
          <Html
            key={desk.id}
            position={[desk.x, 1.45, desk.z]}
            center
            zIndexRange={[20, 0]}
            style={{ pointerEvents: "none" }}
          >
            <div
              className={
                "flex select-none items-center gap-1.5 whitespace-nowrap rounded-full border px-1.5 py-0.5 text-[11px] font-bold shadow-overlay " +
                (mine
                  ? "border-accent bg-accent text-accent-foreground"
                  : free
                    ? "border-success bg-success text-success-foreground"
                    : "border-border bg-overlay/95 text-foreground")
              }
            >
              {person && (
                <span
                  className={
                    "grid size-4 place-items-center rounded-full text-[8px] " +
                    (mine ? "bg-accent-foreground/25" : "bg-accent/20 text-accent")
                  }
                >
                  {initials(person.name)}
                </span>
              )}
              {desk.label && <span className="opacity-80">{desk.label}</span>}
              {person && <span>{mine ? "You" : person.name}</span>}
              {state.kind === "resident" && (
                <Pin className="size-3 opacity-70" aria-label="Permanent desk" />
              )}
              {free && <span>Free</span>}
            </div>
          </Html>
        )
      })}
    </>
  )
}
