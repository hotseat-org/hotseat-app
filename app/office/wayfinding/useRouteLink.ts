import { useEffect, useRef } from "react"
import { useOfficeStore, useOfficeStoreApi } from "../store"
import { getAllPieces } from "~/editor"

/**
 * Wayfinding: a shared link (?to=<desk>) opens with the way to that desk
 * shown; the URL then follows whatever way is shown, so "Copy link" is just
 * the page's address. Editing puts it away.
 */
export const useRouteLink = (readOnly: boolean) => {
  const store = useOfficeStoreApi()
  const routeDesk = useOfficeStore((state) => state.route?.deskId)
  const hasLayout = useOfficeStore(
    (state) => state.objects.length > 0 || state.otherFloorsPieces.length > 0
  )
  const askedRoute = useRef(false)
  useEffect(() => {
    if (askedRoute.current || !hasLayout) return

    askedRoute.current = true
    const to = new URL(window.location.href).searchParams.get("to")
    // On any floor: showing the way shows its floor.
    if (to && getAllPieces(store.getState()).some((piece) => piece.id === to))
      store.getState().showRoute(to)
  }, [hasLayout, store])
  useEffect(() => {
    if (!askedRoute.current) return

    const url = new URL(window.location.href)
    if (routeDesk) url.searchParams.set("to", routeDesk)
    else url.searchParams.delete("to")
    if (url.href !== window.location.href)
      window.history.replaceState(window.history.state, "", url)
  }, [routeDesk])
  useEffect(() => {
    if (!readOnly) store.getState().clearRoute()
  }, [readOnly, store])
}
