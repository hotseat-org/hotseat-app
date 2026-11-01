import { useEffect, useState } from "react"

/** How far apart the inspector and what's above it must stay (px). */
const GAP = 12

/**
 * The room above a box anchored to the bottom of its column (px, from the
 * column's top, less a gap) — kept up to date as the box grows and shrinks;
 * null while it shows nothing.
 */
export const useRoomAbove = (box: HTMLElement | null) => {
  const [room, setRoom] = useState<number | null>(null)

  useEffect(() => {
    if (!box) return

    const update = () => {
      const column = box.parentElement?.getBoundingClientRect()
      const rect = box.getBoundingClientRect()
      setRoom(column && rect.height > 0 ? rect.top - column.top - GAP : null)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(box)
    window.addEventListener("resize", update)

    return () => {
      observer.disconnect()
      window.removeEventListener("resize", update)
    }
  }, [box])

  return room
}
