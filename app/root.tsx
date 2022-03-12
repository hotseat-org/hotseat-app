import {
  Links,
  LinksFunction,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from 'remix'
import type { MetaFunction } from 'remix'

import tailwindStyles from './tailwind.css'
import datePickerStyle from 'react-day-picker/lib/style.css'

export let links: LinksFunction = () => {
  return [{ rel: 'stylesheet', href: tailwindStyles },
  { rel: 'stylesheet', href: datePickerStyle }
]
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
      <body className="bg-slate-800 text-slate-100">
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  )
}
