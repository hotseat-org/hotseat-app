import type { ShouldRevalidateFunctionArgs } from "react-router"

/**
 * Search params that only drive overlays: settings modals (`settings`, their
 * sub-dialog `dialog`), create modals (`modal`) and an office's modals from
 * its rail (`panel`). Opening or closing one mustn't re-run the loaders of
 * the page underneath.
 */
const OVERLAY_PARAMS = ["settings", "dialog", "modal", "panel", "person"]

/** Actions that change an office's bookings (and its desk preferences): no one else's data. */
export const BOOKING_ACTIONS = "/api/reservations/"
/** Marking notifications read: only the bell's data (the organization layout's). */
export const NOTIFICATION_ACTIONS = "/api/notifications"

const without = (url: URL, keys: string[]) => {
  const params = new URLSearchParams(url.search)
  for (const k of keys) params.delete(k)
  params.sort()
  return params.toString()
}

/** The open settings panel of a scope ("org/members"), or null. */
const panel = (url: URL, scope: string) => {
  const raw = url.searchParams.get("settings") ?? ""
  return raw === scope || raw.startsWith(`${scope}/`) ? raw : null
}

/**
 * `shouldRevalidate` for a route whose data depends only on the given URL
 * params (and, for a layout that owns a settings scope, that scope's open
 * panel). Plain navigations that change nothing it depends on — opening a
 * modal, moving between child routes, switching a settings section — keep the
 * data it has instead of reloading it (React Router otherwise re-runs every
 * matched loader on every navigation).
 *
 * Mutations (form/fetcher submissions) and explicit `revalidate()` calls still
 * revalidate as usual — except after the actions in `unaffectedBy` (paths of
 * actions that can't change this route's data: a booking doesn't change the
 * user or the organization), which leave it as it is.
 */
export const revalidateOn =
  ({
    params = [],
    settings,
    unaffectedBy = [],
  }: { params?: string[]; settings?: "user" | "org"; unaffectedBy?: string[] } = {}) =>
  (args: ShouldRevalidateFunctionArgs) => {
    const { currentUrl, nextUrl, currentParams, nextParams, formMethod, formAction } = args
    if (formMethod && unaffectedBy.some((action) => formAction?.includes(action))) return false
    if (formMethod || currentUrl.href === nextUrl.href) return args.defaultShouldRevalidate
    if (params.some((k) => currentParams[k] !== nextParams[k])) return args.defaultShouldRevalidate
    if (without(currentUrl, OVERLAY_PARAMS) !== without(nextUrl, OVERLAY_PARAMS))
      return args.defaultShouldRevalidate
    if (!settings) return false
    // Load when a panel of this scope opens or switches; closing needs nothing.
    const next = panel(nextUrl, settings)
    return next !== null && next !== panel(currentUrl, settings)
  }
