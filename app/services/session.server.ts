import { createCookieSessionStorage, redirect } from "react-router"
import { returnToPage, sessionCookie } from "~/cookies"
import { User } from "~/core/user/types"

export const sessionStorage = createCookieSessionStorage({
  cookie: sessionCookie,
})

export async function requireUser(request: Request): Promise<User> {
  const session = await sessionStorage.getSession(request.headers.get("cookie"))
  const user = session.get("user")

  if (!user) {
    const url = new URL(request.url)
    // Strip the `.data` suffix present on data requests (v8 passThroughRequests)
    const returnTo = url.pathname.replace(/\.data$/, "")

    throw redirect("/login", {
      headers: { "Set-cookie": await returnToPage.serialize(returnTo) },
    })
  }
  return user
}

export async function isAuthenticated(request: Request) {
  const session = await sessionStorage.getSession(request.headers.get("cookie"))
  const user = session.get("user")
  return user
}

export const { getSession, commitSession, destroySession } = sessionStorage
