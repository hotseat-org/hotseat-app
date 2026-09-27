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
  const section = officeMatch ? (officeMatch.params.section ?? "general") : paramSection
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

  const open = useCallback(
    (nextScope: SettingsScope, nextSection: string) => {
      if (nextScope === "office") {
        navigate(`${officeUrl}/settings/${nextSection}${searchWithout("settings", "dialog")}`)
        return
      }
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.set("settings", `${nextScope}/${nextSection}`)
        next.delete("dialog")
        return next
      })
    },
    [navigate, officeUrl, searchWithout, setSearchParams]
  )

  const selectSection = useCallback(
    (nextSection: string) => {
      if (officeMatch) {
        navigate(`${officeUrl}/settings/${nextSection}${searchWithout("dialog")}`, {
          replace: true,
        })
        return
      }
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          const [currentScope] = next.get("settings")?.split("/") ?? []
          next.set("settings", `${currentScope}/${nextSection}`)
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
