import type { ShouldRevalidateFunctionArgs } from "react-router"

/**
 * Search params that only drive overlays: settings modals (`settings`, their
 * sub-dialog `dialog`) and create modals (`modal`). Opening or closing one
 * mustn't re-run the loaders of the page underneath.
 */
const OVERLAY_PARAMS = ["settings", "dialog", "modal"]

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
 * revalidate as usual.
 */
export const revalidateOn =
  ({ params = [], settings }: { params?: string[]; settings?: "user" | "org" } = {}) =>
  (args: ShouldRevalidateFunctionArgs) => {
    const { currentUrl, nextUrl, currentParams, nextParams, formMethod } = args
    if (formMethod || currentUrl.href === nextUrl.href) return args.defaultShouldRevalidate
    if (params.some((k) => currentParams[k] !== nextParams[k])) return args.defaultShouldRevalidate
    if (without(currentUrl, OVERLAY_PARAMS) !== without(nextUrl, OVERLAY_PARAMS))
      return args.defaultShouldRevalidate
    if (!settings) return false
    // Load when a panel of this scope opens or switches; closing needs nothing.
    const next = panel(nextUrl, settings)
    return next !== null && next !== panel(currentUrl, settings)
  }
