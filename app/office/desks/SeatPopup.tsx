import { Html } from "@react-three/drei"
import { useMemo } from "react"
import { SeatCardBody, useSeatCard } from "../booking/seatCard"
import { getColumnSlot } from "./columnSlot"

/**
 * View mode (3D): the booking card for a clicked desk, in the office's left
 * column (the headline makes way for it). A drei <Html>, for the scene's
 * contexts, held at a fixed place on the screen.
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
  const columnSlot = useMemo(() => {
    const slot = getColumnSlot()

    return slot ? { current: slot } : undefined
  }, [])
  if (!card) return null

  return (
    <Html
      // Held in the office's left column (where the headline is), not over the
      // desk: words with no card read on the ground, never over the model.
      position={[card.seat.x, 1.3, card.seat.z]}
      calculatePosition={getColumnPosition}
      zIndexRange={[60, 40]}
      // Drawn in the shell's column slot, over the sheet behind the column.
      portal={columnSlot}
      // drei's wrapper must not catch clicks either (only the buttons do).
      style={{ pointerEvents: "none" }}
    >
      <SeatCardBody key={card.key} layout="column" {...card.body} />
    </Html>
  )
}

/** The column's corner on the canvas: the headline's, under the top bar (two rows below 1280px). */
export const getColumnPosition = () => [24, window.innerWidth < 1280 ? 148 : 96]
