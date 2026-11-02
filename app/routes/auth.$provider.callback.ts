import { redirect, type LoaderFunction } from "react-router"
import { authenticator, prepareSignIn } from "../services/auth.server"
import { returnToPage } from "~/cookies"
import { sessionStorage } from "~/services/session.server"

export const loader: LoaderFunction = async ({ request, params }) => {
  const provider = params.provider

  const successRedirect = (await returnToPage.parse(request.headers.get("cookie"))) ?? "/"

  if (!provider || !(await prepareSignIn(provider))) return redirect("/login")

  const user = await authenticator.authenticate(provider, request)

  const session = await sessionStorage.getSession(request.headers.get("cookie"))
  session.set("user", user)

  throw redirect(successRedirect, {
    headers: { "Set-Cookie": await sessionStorage.commitSession(session) },
  })
}
