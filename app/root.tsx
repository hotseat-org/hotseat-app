import {
  Links,
  Meta,
  MetaFunction,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  isRouteErrorResponse,
  useRouteError,
  useRouteLoaderData,
} from "react-router"
import type { LinksFunction, LoaderFunctionArgs } from "react-router"
import { PreventFlashOnWrongTheme, ThemeProvider, useTheme } from "remix-themes"
import clsx from "clsx"
import { themeSessionResolver } from "./services/theme.server"
import { isAuthenticated } from "./services/session.server"
import { CenteredScreen } from "~/components/ui/CenteredScreen"
import { getCore } from "~/core/get-core"
import stylesheet from "~/styles/tailwind.css?url"
import { revalidateOn } from "~/utils/revalidation"

export const links: LinksFunction = () => [{ rel: "stylesheet", href: stylesheet }]

export const meta: MetaFunction = () => {
  return [{ title: "Hot Seat" }]
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const sessionUser = await isAuthenticated(request)
  // The session stores the user from login time, including a SIGNED photo URL
  // that expires at the end of that day — re-read the user each request so the
  // photo URL is always fresh (falls back to the session copy).
  const user = sessionUser
    ? ((await getCore()
        .user.get(sessionUser.email)
        .catch(() => null)) ?? sessionUser)
    : undefined
  const { getTheme } = await themeSessionResolver(request)
  const theme = getTheme()

  return { user, theme }
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
    // "h-full" first: with no theme cookie, remix-themes' anti-flash script
    // APPENDS the system theme to the server's class ("h-full" → "h-full dark")
    // before hydration — the client must produce that exact string, or React
    // reports a hydration mismatch.
    <html lang="en" className={clsx("h-full", theme)}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <PreventFlashOnWrongTheme ssrTheme={Boolean(data.theme)} />
        <Links />
      </head>
      <body className="h-full">
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

/**
 * App-wide error page (404s from loaders, unexpected errors) in the app's own
 * style — instead of React Router's raw "Application Error" stack trace. The
 * error detail is shown only in development.
 */
export function ErrorBoundary() {
  const error = useRouteError()
  const data = useRouteLoaderData<typeof loader>("root")
  const notFound = isRouteErrorResponse(error) && error.status === 404
  const title = notFound ? "Nothing here" : "Something went wrong"
  const message = notFound
    ? typeof error.data === "string"
      ? `${error.data}. It may have been removed, or you don't have access to it.`
      : "This page doesn't exist, or you don't have access to it."
    : "An unexpected error happened. Try again in a moment."
  const detail =
    import.meta.env.DEV && !notFound
      ? error instanceof Error
        ? error.message
        : isRouteErrorResponse(error)
          ? `${error.status} ${error.statusText}`
          : String(error)
      : null

  return (
    // No ThemeProvider here: with no theme cookie, follow the system theme via a
    // tiny pre-paint script (hence suppressHydrationWarning on the class).
    <html lang="en" className={clsx("h-full", data?.theme)} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        {!data?.theme && (
          <script
            dangerouslySetInnerHTML={{
              __html:
                "document.documentElement.classList.add(matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')",
            }}
          />
        )}
        <title>{`${title} · Hot Seat`}</title>
        <Meta />
        <Links />
      </head>
      <body className="h-full">
        <CenteredScreen>
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-overlay/90 p-8 text-center text-foreground shadow-overlay backdrop-blur-md">
            <p className="text-5xl font-extrabold tabular-nums text-accent">
              {isRouteErrorResponse(error) ? error.status : "Oops"}
            </p>
            <h1 className="mt-3 text-xl font-extrabold tracking-tight">{title}</h1>
            <p className="mt-1.5 text-sm text-muted">{message}</p>
            {detail && (
              <pre className="mt-4 overflow-x-auto rounded-lg bg-foreground/5 p-3 text-left text-xs text-danger">
                {detail}
              </pre>
            )}
            <a
              href="/app"
              className="mt-6 inline-flex rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground transition hover:brightness-105"
            >
              Back to your offices
            </a>
          </div>
        </CenteredScreen>
        <Scripts />
      </body>
    </html>
  )
}

// Opening a settings/create modal over this page doesn't change its data.
export const shouldRevalidate = revalidateOn()
