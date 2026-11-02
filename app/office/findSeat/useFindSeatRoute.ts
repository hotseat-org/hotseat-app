import { useCallback } from "react"
import { useLocation, useMatch, useNavigate, useParams } from "react-router"

/**
 * Whether finding a seat is open — it has its own address (`…/find`, see its
 * route) — and how to open and close it, keeping the day shown (`?day=`).
 * Closing can open one of the rail's panels instead (`?panel=`).
 */
export const useFindSeatRoute = () => {
  const { slug, officeSlug } = useParams()
  const isOpen = !!useMatch("/app/o/:slug/offices/:officeSlug/find")
  const { search } = useLocation()
  const navigate = useNavigate()
  const officePath = `/app/o/${slug}/offices/${officeSlug}`

  const open = useCallback(() => {
    const params = new URLSearchParams(search)
    params.delete("panel")
    const query = params.toString()

    navigate(`${officePath}/find${query ? `?${query}` : ""}`, { preventScrollReset: true })
  }, [navigate, officePath, search])

  const close = useCallback(
    (panel?: string) => {
      const params = new URLSearchParams(search)
      if (panel) params.set("panel", panel)

      const query = params.toString()

      navigate(`${officePath}${query ? `?${query}` : ""}`, { preventScrollReset: true })
    },
    [navigate, officePath, search]
  )

  return { isOpen, open, close }
}
