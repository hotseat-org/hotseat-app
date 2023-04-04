import type { LoaderArgs } from '@remix-run/node'
import tailwindStyles from './tailwind.css'
import {
  Meta,
  Links,
  Outlet,
  ScrollRestoration,
  Scripts,
  LiveReload,
  useLoaderData,
} from '@remix-run/react'
import type {
  LinksFunction,
  MetaFunction,
} from '@remix-run/react/dist/routeModules'
import { authenticator } from './services/auth.server'
import { Navbar } from './components/Navbar'

export let links: LinksFunction = () => {
  return [{ rel: 'stylesheet', href: tailwindStyles }]
}

export const meta: MetaFunction = () => {
  return { title: 'qseat' }
}

export const loader = async ({ request }: LoaderArgs) => {
  const user = await authenticator.isAuthenticated(request)

  return {
    user,
  }
}

export default function App() {
  const { user } = useLoaderData<typeof loader>()

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="bg-blue-gray-100">
        {user && <Navbar />}
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  )
}
