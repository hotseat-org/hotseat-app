import { Html } from "@react-three/drei"
import { SeatCardBody, useSeatCard } from "../seatCard"

/**
 * View mode (3D): the booking card for a clicked desk, rendered IN the scene — a
 * drei <Html> anchored above the desk, so it follows the desk as the camera
 * orbits/pans. Pops in with a spring; eases out on close.
 *
 * For the shown day it says who has the desk (a permanent resident, a booking,
 * or nobody) and offers quick choices: just this day, the rest of the week, or
 * the same weekday every week. Booking shows at once (optimistic) and the
 * route confirms it.
 *
 * drei renders <Html> content in its own React root, so the editor's contexts
 * (store, people) don't reach inside: everything is read here and handed to
 * the card as plain props/closures. HeroUI needs no provider — its theme is CSS
 * variables in the same document — so its components work as-is.
 */

export const SeatPopup = () => {
  const card = useSeatCard()
  if (!card) return null
  return (
    <Html
      // Anchored just above the desk; the card sits above this point.
      position={[card.seat.x, 1.3, card.seat.z]}
      zIndexRange={[60, 40]}
      // drei's wrapper must not catch clicks either (only the buttons do).
      style={{ pointerEvents: "none" }}
    >
      <SeatCardBody key={card.key} {...card.body} />
    </Html>
  )
}
