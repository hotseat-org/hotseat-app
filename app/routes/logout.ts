import type { ActionFunction, LoaderFunction } from "@vercel/remix"
import { authenticator } from "../services/auth.server.js"

export const action: ActionFunction = ({ request }) => {
  return authenticator.logout(request, {
    redirectTo: "/login",
  })
}

export const loader: LoaderFunction = ({ request }) => {
  authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  })

  return authenticator.logout(request, {
    redirectTo: "/login",
  })
}
