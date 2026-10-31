import { useCallback } from "react"
import { useMatch, useNavigate, useParams, useSearchParams } from "react-router"

export type SettingsScope = "user" | "org" | "office"

const OFFICE_SETTINGS = "/app/o/:slug/offices/:officeSlug/settings/:section?"

/**
 * Opens, switches and closes the settings modals. Everything lives in the URL,
 * so a settings link reloads, shares and server-renders like any page:
 *
 *   - Office settings are a route of their own, a child of the office:
 *       /app/o/<org>/offices/<office>/settings/<section>
 *   - User and organization settings open over whatever page you're on, so
 *     they're a search param on that page:
 *       ?settings=<scope>/<section>   e.g. ?settings=user/profile, ?settings=org/members
 *   - A sub-dialog over the active panel, in any scope:
 *       &dialog=<id>
 *
 * Closing returns exactly to the page underneath, which stays mounted.
 */
export function useSettings() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { slug, officeSlug } = useParams()
  const officeMatch = useMatch(OFFICE_SETTINGS)

  const raw = searchParams.get("settings") ?? undefined
  const [paramScope, paramSection] = (raw?.split("/") ?? []) as [
    SettingsScope | undefined,
    string | undefined,
  ]
  const scope: SettingsScope | undefined = officeMatch ? "office" : paramScope
  // Unset: no section picked yet (a phone shows the list of them; a larger
  // screen, the first).
  const section = officeMatch ? officeMatch.params.section : paramSection
  const dialog = searchParams.get("dialog") ?? undefined

  const officeUrl = `/app/o/${slug}/offices/${officeSlug}`
  /** The current search params minus the given keys, as "?…" (or ""). */
  const searchWithout = useCallback(
    (...keys: string[]) => {
      const next = new URLSearchParams(searchParams)
      for (const k of keys) next.delete(k)
      const s = next.toString()
      return s ? `?${s}` : ""
    },
    [searchParams]
  )

  /** Open a scope's settings — at a section, or (none given) at the list of them. */
  const open = useCallback(
    (nextScope: SettingsScope, nextSection?: string) => {
      const sectionPath = nextSection ? `/${nextSection}` : ""
      if (nextScope === "office") {
        navigate(`${officeUrl}/settings${sectionPath}${searchWithout("settings", "dialog")}`)
        return
      }
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.set("settings", `${nextScope}${sectionPath}`)
        next.delete("dialog")
        return next
      })
    },
    [navigate, officeUrl, searchWithout, setSearchParams]
  )

  /** Pick a section; null goes back to the list of them (a phone's). */
  const selectSection = useCallback(
    (nextSection: string | null) => {
      const sectionPath = nextSection ? `/${nextSection}` : ""
      if (officeMatch) {
        navigate(`${officeUrl}/settings${sectionPath}${searchWithout("dialog")}`, {
          replace: true,
        })
        return
      }
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          const [currentScope] = next.get("settings")?.split("/") ?? []
          next.set("settings", `${currentScope}${sectionPath}`)
          next.delete("dialog")
          return next
        },
        { replace: true }
      )
    },
    [officeMatch, navigate, officeUrl, searchWithout, setSearchParams]
  )

  const close = useCallback(() => {
    if (officeMatch) {
      navigate(`${officeUrl}${searchWithout("dialog")}`)
      return
    }
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete("settings")
      next.delete("dialog")
      return next
    })
  }, [officeMatch, navigate, officeUrl, searchWithout, setSearchParams])

  const openDialog = useCallback(
    (nextDialog: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.set("dialog", nextDialog)
        return next
      })
    },
    [setSearchParams]
  )

  const closeDialog = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete("dialog")
        return next
      },
      { replace: true }
    )
  }, [setSearchParams])

  return { scope, section, dialog, open, selectSection, close, openDialog, closeDialog }
}
