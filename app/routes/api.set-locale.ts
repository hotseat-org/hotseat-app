import type { ActionFunctionArgs } from "react-router"
import { isLocale } from "~/i18n/locales"
import { localeCookie } from "~/i18n/locale.server"

/** Save the language for this device (posted by the language picker). */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { locale } = (await request.json().catch(() => ({}))) as { locale?: unknown }
  if (!isLocale(locale))
    return Response.json({ ok: false, error: "Unknown language." }, { status: 400 })
  return Response.json(
    { ok: true },
    { headers: { "Set-Cookie": await localeCookie.serialize(locale) } }
  )
}
