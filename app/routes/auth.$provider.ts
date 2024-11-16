import { redirect, type ActionFunction } from "@vercel/remix"
import { authenticator } from "../services/auth.server.js"

export const loader = () => redirect("/login")

export const action: ActionFunction = ({ request, params }) => {
  const provider = params.provider

  if (!provider) return redirect("/login")

  return authenticator.authenticate(provider, request, {
    successRedirect: "/",
    failureRedirect: "/login",
  })
}
