import { useDebounce } from "@uidotdev/usehooks"
import { useEffect, useState } from "react"
import { useLocation, useNavigate, type FetcherWithComponents } from "react-router"
import slugify from "slugify"

/**
 * Name field whose URL (slug) follows it — shared by organization and office
 * settings. Previews the new slug, live-checks it (`intent=check-name` on
 * `action`) and reports whether it's taken. Only an actual rename moves the
 * URL: a name that already differs from its slug keeps it on other edits.
 */
export function useRename({
  currentName,
  currentSlug,
  action,
}: {
  currentName: string
  currentSlug: string
  action: string
}) {
  const [name, setName] = useState(currentName)
  // Server data changed (saved, or another page) → follow it.
  useEffect(() => setName(currentName), [currentName])

  const renamed = name.trim() !== currentName.trim()
  const slug = renamed ? slugify(name, { lower: true, trim: true }) : currentSlug
  const slugChanges = renamed && !!slug && slug !== currentSlug

  // A plain fetch, not a fetcher: a failed *check* (offline, blip) must not take
  // the page down — a failing fetcher bubbles to the route's error boundary.
  const [check, setCheck] = useState<{ slug: string; available: boolean }>()
  const debounced = useDebounce(name, 350)
  useEffect(() => {
    if (!slugChanges) return
    const ctrl = new AbortController()
    fetch(action, {
      method: "POST",
      body: new URLSearchParams({ intent: "check-name", name: debounced }),
      headers: { Accept: "application/json" },
      signal: ctrl.signal,
    })
      .then((r) => (r.ok ? r.json() : undefined))
      .then((d) => d && typeof d.available === "boolean" && setCheck(d))
      .catch(() => {}) // unknown availability: the save itself still validates
    return () => ctrl.abort()
    // Only the debounced name should trigger a check.
  }, [debounced])
  const checked = check?.slug === slug ? check : undefined

  return {
    name,
    setName,
    renamed,
    slug,
    slugChanges,
    available: slugChanges && checked?.available === true,
    taken: slugChanges && checked?.available === false,
  }
}

/**
 * After a save that returned a new slug, move to the same page under the new
 * URL (keeps `?settings=…` open). `segment` is the URL part holding the slug,
 * e.g. `/app/o/` or `/offices/`.
 */
export function useFollowSlug(
  fetcher: FetcherWithComponents<{ slug?: string } | undefined>,
  currentSlug: string,
  segment: string
) {
  const navigate = useNavigate()
  const location = useLocation()
  useEffect(() => {
    const saved = fetcher.data?.slug
    if (fetcher.state !== "idle" || !saved || saved === currentSlug) return
    navigate(
      location.pathname.replace(`${segment}${currentSlug}`, `${segment}${saved}`) + location.search,
      { replace: true }
    )
  }, [
    fetcher.state,
    fetcher.data,
    currentSlug,
    segment,
    navigate,
    location.pathname,
    location.search,
  ])
}
