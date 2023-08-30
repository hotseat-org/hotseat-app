import { createCookieSessionStorage, redirect } from '@vercel/remix'
import { authenticator } from './auth.server'
import { returnToPage, sessionCookie } from '~/cookies'

export const sessionStorage = createCookieSessionStorage({
  cookie: sessionCookie,
})

export async function requireUser(request: Request) {
  const user = await authenticator.isAuthenticated(request)

  if (!user) {
    const url = new URL(request.url)

    throw redirect(`/login`, {
      headers: { 'Set-cookie': await returnToPage.serialize(url.pathname) },
    })
  }
  return user
}

export const { getSession, commitSession, destroySession } = sessionStorage
