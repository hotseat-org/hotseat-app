import { data, type ActionFunctionArgs } from "react-router"
import { z } from "zod"
import { getCore } from "~/core/get-core"
import { MODELS } from "~/editor/objects/models"
import { commitSession, getSession, requireUser } from "~/services/session.server"

const Intent = z.enum(["update-profile", "set-avatar", "delete-avatar", "set-pet"])
/** A known pet id, or "" = back to the one derived from the email. */
const PetId = z.union([z.literal(""), z.enum(MODELS.map((m) => m.id) as [string, ...string[]])])

export const action = async ({ request }: ActionFunctionArgs) => {
  const user = await requireUser(request)
  const formData = await request.formData()
  const intent = Intent.parse(formData.get("intent"))
  const core = getCore()

  const updatedUser = await (() => {
    switch (intent) {
      case "update-profile": {
        const displayName = z.string().parse(formData.get("displayName"))
        return core.user.update({ email: user.email, data: { displayName } })
      }
      case "set-avatar": {
        const thumbnail = z.string().parse(formData.get("thumbnail"))
        return core.user.update({ email: user.email, data: { avatarUrl: thumbnail } })
      }
      case "delete-avatar":
        return core.user.update({ email: user.email, data: { avatarUrl: null } })
      case "set-pet": {
        const pet = PetId.parse(formData.get("pet"))
        return core.user.update({ email: user.email, data: { pet: pet || null } })
      }
    }
  })()

  const session = await getSession(request.headers.get("cookie"))
  session.set("user", updatedUser)
  const headers = new Headers({ "Set-Cookie": await commitSession(session) })

  return data({ ok: true }, { headers })
}
