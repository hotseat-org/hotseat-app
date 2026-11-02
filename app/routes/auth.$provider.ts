import { redirect, type ActionFunction } from "react-router"
import { authenticator, prepareSignIn } from "../services/auth.server.js"
import { returnToPage } from "~/cookies"

export const loader: ActionFunction = async ({ request, params }) => {
  const provider = params.provider

  if (!provider || !(await prepareSignIn(provider))) return redirect("/login")

  // Only honor same-origin, relative redirects (no open-redirect).
  const redirectTo = new URL(request.url).searchParams.get("redirectTo")
  const safeRedirect =
    redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : null

  try {
    return await authenticator.authenticate(provider, request)
  } catch (response) {
    // remix-auth throws a redirect Response to the provider — attach the
    // return-to cookie so the callback lands the user back where they started.
    if (response instanceof Response && safeRedirect) {
      response.headers.append("Set-Cookie", await returnToPage.serialize(safeRedirect))
    }
    throw response
  }
}
