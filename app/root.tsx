import { NextUIProvider } from '@nextui-org/react'
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from '@remix-run/react'
import type { MetaFunction } from '@remix-run/react/dist/routeModules'
import type { LinksFunction, LoaderFunctionArgs } from '@vercel/remix'
import { authenticator } from './services/auth.server'
import { themeSessionResolver } from './services/theme.server'

import { PreventFlashOnWrongTheme, ThemeProvider, useTheme } from 'remix-themes'
import stylesheet from '~/styles/tailwind.css?url'

export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: stylesheet },
]

export const meta: MetaFunction = () => {
  return [{ title: 'Hot Seat' }]
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await authenticator.isAuthenticated(request)
  const { getTheme } = await themeSessionResolver(request)

  return { user, theme: getTheme() }
}

export default function AppWithProvider() {
  const data = useLoaderData<typeof loader>()

  return (
    <ThemeProvider specifiedTheme={data.theme} themeAction="/api/set-theme">
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
      </body>
    </html>
  )
}
