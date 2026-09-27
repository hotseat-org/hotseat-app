import { redirect, type ActionFunction, type LoaderFunction } from "react-router"
import { isAuthenticated, sessionStorage } from "~/services/session.server.js"

const logout = async (request: Request) => {
  const session = await sessionStorage.getSession(request.headers.get("cookie"))
  return redirect("/login", {
    headers: { "Set-Cookie": await sessionStorage.destroySession(session) },
  })
}

export const action: ActionFunction = async ({ request }) => {
  return logout(request)
}

export const loader: LoaderFunction = async ({ request }) => {
  if (!(await isAuthenticated(request))) return redirect("/login")

  return logout(request)
}
