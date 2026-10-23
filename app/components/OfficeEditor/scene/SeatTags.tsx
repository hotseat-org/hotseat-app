import { Html } from "@react-three/drei"
import { Pin } from "lucide-react"
import { useEditorStore } from "../store"
import { personByEmail, usePeople } from "../people"
import { SeatAvatar } from "../SeatAvatar"
import { useDesksOnDay } from "../useBooking"

/**
 * View mode: a floating tag over every desk for the shown day: who sits there
 * (their avatar, as on the plan, over a name pill — a pin marks a permanent
 * resident, you're highlighted), or "Free" when it can still be booked. Without booking (standalone) only labelled or
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
            // Booked: higher, so the avatar floats over whoever sits there.
            position={[desk.x, person ? 1.75 : 1.45, desk.z]}
            center
            zIndexRange={[20, 0]}
            style={{ pointerEvents: "none" }}
          >
            <div className="flex select-none flex-col items-center gap-1">
              {person && state.kind !== "free" && (
                <SeatAvatar person={person} email={state.email} isMine={mine} size={40} />
              )}
              <div
                className={
                  "flex items-center gap-1.5 whitespace-nowrap rounded-full border px-1.5 py-0.5 text-[11px] font-bold shadow-overlay " +
                  (mine
                    ? "border-accent bg-accent text-accent-foreground"
                    : free
                      ? "border-success bg-success text-success-foreground"
                      : "border-border bg-overlay/95 text-foreground")
                }
              >
                {desk.label && <span className="opacity-80">{desk.label}</span>}
                {/* First name only: neighbouring desks' tags would collide. */}
                {person && <span>{mine ? "You" : person.name.split(" ")[0]}</span>}
                {state.kind === "resident" && (
                  <Pin className="size-3 opacity-70" aria-label="Permanent desk" />
                )}
                {free && <span>Free</span>}
              </div>
            </div>
          </Html>
        )
      })}
    </>
  )
}
