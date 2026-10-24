import { createCookie } from "react-router"
import { isLocale, localeFromAcceptLanguage, type Locale } from "./locales"
import { createTranslator } from "./translate"

/** The language picked in Settings (per device, like the theme). */
export const localeCookie = createCookie("locale", {
  maxAge: 60 * 60 * 24 * 365,
  sameSite: "lax",
  path: "/",
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
})

/** The reader's language: the one they picked, else their browser's. */
export const getLocale = async (request: Request): Promise<Locale> => {
  const picked = await localeCookie.parse(request.headers.get("Cookie"))
  return isLocale(picked)
    ? picked
    : localeFromAcceptLanguage(request.headers.get("Accept-Language"))
}

/** A translator for the reader of this request (loaders, actions, meta). */
export const getTranslator = async (request: Request) => createTranslator(await getLocale(request))
