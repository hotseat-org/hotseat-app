import { redirect, type LoaderFunction } from "react-router"
import { authenticator } from "../services/auth.server"
import { returnToPage } from "~/cookies"

export const loader: LoaderFunction = async ({ request, params }) => {
  const provider = params.provider

  const successRedirect = (await returnToPage.parse(request.headers.get("Cookie"))) ?? "/"

  if (!provider) return redirect("/login")

  await authenticator.authenticate(provider, request, {
    successRedirect,
    failureRedirect: "/login",
  })
}
