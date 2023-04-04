import { createCookieSessionStorage, redirect } from '@remix-run/node'
import { authenticator } from './auth.server'

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    maxAge: 3600,
    name: 'google_session', // use any name you want here
    sameSite: 'lax', // this helps with CSRF
    path: '/', // remember to add this so the cookie will work in all routes
    httpOnly: true, // for security reasons, make this cookie http only
    secrets: ['s3cr3t'], // replace this with an actual secret
    secure: process.env.NODE_ENV === 'production', // enable this in prod only
  },
})

export async function requireUser(request: Request) {
  const user = await authenticator.isAuthenticated(request)
  if (!user) {
    throw redirect('/login')
  }
  return user
}

export const { getSession, commitSession, destroySession } = sessionStorage
