import { createContext, Fragment, useContext, useMemo, type ReactNode } from "react"
import { I18nProvider as AriaI18nProvider } from "react-aria"
import { DEFAULT_LOCALE, type Locale } from "./locales"
import { createTranslator, type Translator } from "./translate"

const I18nContext = createContext<Translator>(createTranslator(DEFAULT_LOCALE))

/**
 * The reader's language for everything below: our text (`useI18n`), and the
 * built-in text and formats of React Aria / HeroUI (calendars, buttons).
 */
export const I18nProvider = ({ locale, children }: { locale: Locale; children: ReactNode }) => {
  const translator = useMemo(() => createTranslator(locale), [locale])
  return (
    <I18nContext.Provider value={translator}>
      <AriaI18nProvider locale={locale === "cs" ? "cs-CZ" : "en-GB"}>{children}</AriaI18nProvider>
    </I18nContext.Provider>
  )
}

/**
 * Carries the language into a separate React root — the 3D canvas, drei's
 * <Html> — which context from outside doesn't reach.
 */
export const I18nBridge = ({ value, children }: { value: Translator; children: ReactNode }) => (
  <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
)

/** `{ t, tn, format, locale }` for the reader's language. */
export const useI18n = () => useContext(I18nContext)

/**
 * A translated sentence with elements in it: `{name}` placeholders are filled
 * with nodes (a bold name, a link) instead of text.
 */
export const Rich = ({ text, values }: { text: string; values: Record<string, ReactNode> }) => (
  <>
    {text.split(/(\{\w+\})/).map((part, i) => {
      const name = /^\{(\w+)\}$/.exec(part)?.[1]
      return <Fragment key={i}>{name && name in values ? values[name] : part}</Fragment>
    })}
  </>
)
