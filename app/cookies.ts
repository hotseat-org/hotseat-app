import { createCookie } from '@vercel/remix'

export const returnToPage = createCookie('lastPage', {
  maxAge: 60,
  sameSite: 'lax',
  path: '/',
  httpOnly: true,
  secrets: [process.env.COOKIES_SECRET ?? ''],
  secure: process.env.NODE_ENV === 'production',
})

export const sessionCookie = createCookie('session', {
  maxAge: 3600,
  sameSite: 'lax',
  path: '/',
  httpOnly: true,
  secrets: [process.env.COOKIES_SECRET ?? ''],
  secure: process.env.NODE_ENV === 'production',
})

export const themeCookie = createCookie('theme', {
  sameSite: 'lax',
  path: '/',
  httpOnly: true,
  secrets: [process.env.COOKIES_SECRET ?? ''],
  secure: process.env.NODE_ENV === 'production',
})
