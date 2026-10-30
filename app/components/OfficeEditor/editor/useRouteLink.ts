import { useEffect, useRef } from "react"
import { useEditorStore, useEditorStoreApi } from "../store"

/**
 * Wayfinding: a shared link (?to=<desk>) opens with the way to that desk
 * shown; the URL then follows whatever way is shown, so "Copy link" is just
 * the page's address. Editing puts it away.
 */
export const useRouteLink = (readOnly: boolean) => {
  const store = useEditorStoreApi()
  const routeDesk = useEditorStore((s) => s.route?.deskId)
  const hasLayout = useEditorStore((s) => s.objects.length > 0)
  const askedRoute = useRef(false)
  useEffect(() => {
    if (askedRoute.current || !hasLayout) return
    askedRoute.current = true
    const to = new URL(window.location.href).searchParams.get("to")
    if (to && store.getState().objects.some((o) => o.id === to)) store.getState().showRoute(to)
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
