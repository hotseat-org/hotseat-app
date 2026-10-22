import { data, type ActionFunctionArgs } from "react-router"
import { getCore } from "~/core/get-core"
import { requireUser } from "~/services/session.server"

/** Opening the bell marks everything read. */
export const action = async ({ request }: ActionFunctionArgs) => {
  const user = await requireUser(request)
  await getCore().notification.markRead(user.email)
  return data({ ok: true as const })
}
