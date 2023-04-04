import tailwindStyles from './tailwind.css'
import {
  Meta,
  Links,
  Outlet,
  ScrollRestoration,
  Scripts,
  LiveReload,
} from '@remix-run/react'
import { LinksFunction, MetaFunction } from '@remix-run/react/dist/routeModules'

export let links: LinksFunction = () => {
  return [{ rel: 'stylesheet', href: tailwindStyles }]
}

export const meta: MetaFunction = () => {
  return { title: 'qseat' }
}

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="bg-blue-gray-100">
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  )
}
