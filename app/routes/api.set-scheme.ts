import type { ActionFunctionArgs } from "react-router"
import { schemeCookie } from "~/cookies"
import { isSchemeId } from "~/utils/schemes"

/** Save the colour scheme for this device (posted by the Appearance settings). */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { scheme } = (await request.json().catch(() => ({}))) as { scheme?: unknown }
  if (!isSchemeId(scheme))
    return Response.json({ ok: false, error: "Unknown colour scheme." }, { status: 400 })
  return Response.json(
    { ok: true },
    { headers: { "Set-Cookie": await schemeCookie.serialize(scheme) } }
  )
}
