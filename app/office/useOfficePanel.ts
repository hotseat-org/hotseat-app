import { useCallback } from "react"
import { useSearchParams } from "react-router"

/** The office's modals opened from its rail: who's in, your bookings, Insights (admins). */
export const OFFICE_PANELS = ["people", "bookings", "insights"] as const

export type OfficePanel = (typeof OFFICE_PANELS)[number]

/** The search param holding the open one. */
const PANEL_PARAM = "panel"

const isOfficePanel = (value: string | null): value is OfficePanel =>
  OFFICE_PANELS.includes(value as OfficePanel)

/**
 * The office's open modal, kept in the URL (`?panel=people`), like the
 * settings: one at a time — opening another replaces it — and a link,
 * a reload or Back brings it back. The map's own tools (the desk filter, a
 * heatmap, zones) aren't these: they stay beside the map.
 */
export const useOfficePanel = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const value = searchParams.get(PANEL_PARAM)
  const panel = isOfficePanel(value) ? value : null

  const open = useCallback(
    (next: OfficePanel) =>
      setSearchParams(
        (previous) => {
          const params = new URLSearchParams(previous)
          params.set(PANEL_PARAM, next)

          return params
        },
        { preventScrollReset: true }
      ),
    [setSearchParams]
  )
  const close = useCallback(
    () =>
      setSearchParams(
        (previous) => {
          const params = new URLSearchParams(previous)
          params.delete(PANEL_PARAM)

          return params
        },
        { preventScrollReset: true }
      ),
    [setSearchParams]
  )

  return { panel, open, close }
}
