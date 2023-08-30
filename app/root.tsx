import type { LinksFunction, LoaderArgs } from '@vercel/remix'
import {
  Meta,
  Links,
  Outlet,
  ScrollRestoration,
  Scripts,
  LiveReload,
  useLoaderData,
} from '@remix-run/react'
import type { V2_MetaFunction } from '@remix-run/react/dist/routeModules'
import { authenticator } from './services/auth.server'
import { NextUIProvider } from '@nextui-org/react'
import { themeSessionResolver } from './services/theme.server'

import stylesheet from '~/styles/tailwind.css'
import { PreventFlashOnWrongTheme, ThemeProvider, useTheme } from 'remix-themes'

export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: stylesheet },
]

export const meta: V2_MetaFunction = () => {
  return [{ title: 'Hot Seat' }]
}

export const loader = async ({ request }: LoaderArgs) => {
  const user = await authenticator.isAuthenticated(request)
  const { getTheme } = await themeSessionResolver(request)

  return { user, theme: getTheme() }
}

export default function AppWithProvider() {
  const data = useLoaderData<typeof loader>()

  return (
    <ThemeProvider specifiedTheme={data.theme} themeAction="/action/set-theme">
      <App />
    </ThemeProvider>
  )
}

const App = () => {
  const [theme] = useTheme()
  const data = useLoaderData<typeof loader>()

  return (
    <html lang="en" className={theme ?? ''}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <PreventFlashOnWrongTheme ssrTheme={Boolean(data.theme)} />
        <Links />
      </head>
      <body>
        <NextUIProvider>
          <Outlet />
        </NextUIProvider>
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  )
}
