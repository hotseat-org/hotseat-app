import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"
import { DEFAULT_SCHEME, type SchemeId } from "~/utils/schemes"

type SchemeContextValue = [SchemeId, (scheme: SchemeId) => void]

const SchemeContext = createContext<SchemeContextValue>([DEFAULT_SCHEME, () => {}])

/**
 * The colour scheme for this device: starts from the cookie (read by the root
 * loader, so the first paint is right) and changes at once on pick, saved in
 * the background — a plain fetch, so no page data reloads.
 */
export const SchemeProvider = ({
  initialScheme,
  children,
}: {
  initialScheme: SchemeId
  children: ReactNode
}) => {
  const [scheme, setScheme] = useState(initialScheme)
  const pickScheme = useCallback((next: SchemeId) => {
    setScheme(next)
    void fetch(`${import.meta.env.BASE_URL}api/set-scheme`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheme: next }),
    })
  }, [])
  const value = useMemo<SchemeContextValue>(() => [scheme, pickScheme], [scheme, pickScheme])
  return <SchemeContext.Provider value={value}>{children}</SchemeContext.Provider>
}

export const useScheme = () => useContext(SchemeContext)
