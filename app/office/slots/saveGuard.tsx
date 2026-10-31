import { useMemo, useState } from "react"
import { isSeatable } from "../catalog"
import { LayoutImpact } from "../booking/LayoutImpact"
import { type AutosaveControls, type SaveGuard } from "~/editor"
import { useEditorStore } from "~/editor"
import { getLostBookings, planRehoming, type ReleasedBy } from "~/core/office/layoutImpact"

declare module "~/editor/module" {
  interface SaveOptions {
    /** Bookings the change takes away move to free desks (else they're cancelled). */
    shouldRehome?: boolean
  }
}

const bookingKey = (booking: { deskId: string; date: string; userEmail: string }) =>
  `${booking.deskId}|${booking.date}|${booking.userEmail}`

/**
 * The office's save guard: an unsaved change that would take upcoming
 * bookings away (desks removed or made permanent) isn't saved until the admin
 * chooses — move them to free desks, cancel them, or undo (see LayoutImpact).
 */
export const useLayoutImpactGuard = ({
  isEnabled,
  objects,
  getSavedObjects,
  saveNow,
  revert,
}: AutosaveControls): SaveGuard => {
  // What an unsaved change would do to upcoming bookings: who'd lose their
  // desk, and where they could move.
  const bookingState = useEditorStore((state) => state.booking)
  const impact = useMemo(() => {
    const booking = bookingState
    if (!isEnabled || !booking.enabled || !booking.today) return null

    const bookings = Object.entries(booking.byDay).flatMap(([date, desks]) =>
      date >= booking.today
        ? Object.entries(desks).map(([deskId, userEmail]) => ({ deskId, date, userEmail }))
        : []
    )
    if (bookings.length === 0) return null

    const releasedBy: ReleasedBy = new Map(
      Object.entries(booking.released).flatMap(([date, desks]) =>
        Object.entries(desks).map(([deskId, email]): [string, string] => [
          `${deskId}|${date}`,
          email,
        ])
      )
    )
    const after = objects.filter((piece) => isSeatable(piece.type))
    const lost = getLostBookings(after, bookings, releasedBy)
    if (lost.length === 0) return null

    const before = getSavedObjects().filter((piece) => isSeatable(piece.type))

    return { before, moves: planRehoming({ before, after, bookings, lost, releasedBy }) }
    // The saved layout is read as it stands when the layout or bookings change.
  }, [objects, bookingState, isEnabled])
  // Bookings the admin has already decided about: hidden while that saves and
  // the bookings refresh (the panel comes back only for bookings not yet
  // decided — a further change that takes more).
  const [resolvedKeys, setResolvedKeys] = useState<Set<string>>(() => new Set())
  const isPending =
    !!impact && impact.moves.some((move) => !resolvedKeys.has(bookingKey(move.booking)))
  const resolve = (shouldRehome: boolean) => {
    setResolvedKeys(
      (keys) => new Set([...keys, ...(impact?.moves ?? []).map((move) => bookingKey(move.booking))])
    )
    saveNow({ shouldRehome })
  }

  return {
    isHolding: isPending,
    panel:
      isPending && impact ? (
        <LayoutImpact
          moves={impact.moves}
          labelOf={(id) => impact.before.find((entry) => entry.id === id)?.label}
          onMove={() => resolve(true)}
          onCancel={() => resolve(false)}
          onUndo={revert}
        />
      ) : null,
  }
}
