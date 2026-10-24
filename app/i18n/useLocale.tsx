import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"
import { useRevalidator } from "react-router"
import { I18nProvider } from "./I18nProvider"
import type { Locale } from "./locales"

type LocaleContextValue = [Locale, (locale: Locale) => void]

const LocaleContext = createContext<LocaleContextValue | null>(null)

/**
 * The reader's language: starts from the cookie (or their browser's language —
 * read by the root loader, so the first paint is right). Picking one switches
 * the app at once, then saves it and refreshes the page's data (some is
 * worded on the server).
 */
export const LocaleProvider = ({
  initialLocale,
  children,
}: {
  initialLocale: Locale
  children: ReactNode
}) => {
  const [locale, setLocale] = useState(initialLocale)
  const { revalidate } = useRevalidator()
  const pickLocale = useCallback(
    (next: Locale) => {
      setLocale(next)
      void fetch(`${import.meta.env.BASE_URL}api/set-locale`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: next }),
      }).then(() => revalidate())
    },
    [revalidate]
  )
  const value = useMemo<LocaleContextValue>(() => [locale, pickLocale], [locale, pickLocale])
  return (
    <LocaleContext.Provider value={value}>
      <I18nProvider locale={locale}>{children}</I18nProvider>
    </LocaleContext.Provider>
  )
}

/** `[locale, pickLocale]` */
export const useLocale = () => {
  const value = useContext(LocaleContext)
  if (!value) throw new Error("useLocale outside LocaleProvider")
  return value
}
