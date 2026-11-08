import { useCallback } from "react"
import { useLocation, useMatch, useNavigate, useParams } from "react-router"

/**
 * The office's panels over the map: who's in, your bookings, finding a seat,
 * Insights (admins). Each has its own address under the office's
 * (`…/offices/:officeSlug/people`) — a route of its own (rendering nothing:
 * the office draws the panel, from the data in its scene).
 */
export const OFFICE_PANELS = ["people", "bookings", "find", "insights"] as const

export type OfficePanel = (typeof OFFICE_PANELS)[number]

export const isOfficePanel = (value: string | null | undefined): value is OfficePanel =>
  OFFICE_PANELS.includes(value as OfficePanel)

/**
 * The office's open panel, by its address: one at a time — opening another
 * replaces it — a link or a reload brings it back, and Back closes it. The
 * day shown (`?day=`) stays as it is. The map's own tools (the desk filter,
 * a heatmap, zones) aren't these: they stay beside the map.
 */
export const useOfficePanel = () => {
  const { slug, officeSlug } = useParams()
  const match = useMatch("/app/o/:slug/offices/:officeSlug/:panel")
  const { search } = useLocation()
  const navigate = useNavigate()
  const panel = isOfficePanel(match?.params.panel) ? match.params.panel : null
  const officePath = `/app/o/${slug}/offices/${officeSlug}`

  /** The search without a panel's own params (`team`): they go with it. */
  const getSearch = useCallback(
    (params: Record<string, string | undefined> = {}) => {
      const next = new URLSearchParams(search)
      next.delete("team")
      for (const [key, value] of Object.entries(params)) if (value) next.set(key, value)
      const text = next.toString()

      return text ? `?${text}` : ""
    },
    [search]
  )
  /** Open a panel; Who's in can open at a team (`{ team: id }`). */
  const open = useCallback(
    (next: OfficePanel, params?: { team?: string }) =>
      navigate(`${officePath}/${next}${getSearch(params)}`, {
        preventScrollReset: true,
        // The column moves from what was there into the page (see "Motion" in tailwind.css).
        viewTransition: true,
      }),
    [navigate, officePath, getSearch]
  )
  const close = useCallback(
    () =>
      navigate(`${officePath}${getSearch()}`, { preventScrollReset: true, viewTransition: true }),
    [navigate, officePath, getSearch]
  )

  return { panel, open, close }
}
