import { useDebounce } from "@uidotdev/usehooks"
import { useEffect, useState } from "react"
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
    // A plain fetch doesn't know the app's base path (the app runs under one in production).
    fetch(`${import.meta.env.BASE_URL}${action.replace(/^\//, "")}`, {
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
