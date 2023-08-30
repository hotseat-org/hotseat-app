import { createThemeSessionResolver } from 'remix-themes'
import { createCookieSessionStorage } from '@vercel/remix'
import { themeCookie } from '~/cookies'

const cookieSession = createCookieSessionStorage({ cookie: themeCookie })
export const themeSessionResolver = createThemeSessionResolver(cookieSession)
