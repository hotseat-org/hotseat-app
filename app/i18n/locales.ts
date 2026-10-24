/** The languages the app speaks. English is the source: its text is the key. */
export const LOCALES = ["en", "cs"] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = "en"

/** Each language in itself (for the picker). */
export const LOCALE_NAMES: Record<Locale, string> = { en: "English", cs: "Čeština" }

export const isLocale = (value: unknown): value is Locale =>
  typeof value === "string" && (LOCALES as readonly string[]).includes(value)

/**
 * The language to use for someone who hasn't picked one: the first of their
 * browser's languages we speak (Slovak readers get Czech — closer than English).
 */
export const localeFromAcceptLanguage = (header: string | null): Locale => {
  for (const part of (header ?? "").split(",")) {
    const tag = part.split(";")[0].trim().toLowerCase()
    const language = tag.split("-")[0]
    if (language === "cs" || language === "sk") return "cs"
    if (language === "en") return "en"
  }
  return DEFAULT_LOCALE
}
