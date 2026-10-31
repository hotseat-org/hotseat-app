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
import { schemeCookie } from "./cookies"
import { SchemeProvider, useScheme } from "./utils/hooks/useScheme"
import { DEFAULT_SCHEME, getSchemeBackground, isSchemeId, type SchemeId } from "./utils/schemes"
import { isAuthenticated } from "./services/session.server"
import { CenteredScreen } from "~/components/ui/CenteredScreen"
import { getCore } from "~/core/get-core"
import stylesheet from "~/styles/tailwind.css?url"
import { revalidateOn } from "~/utils/revalidation"
import { LocaleProvider } from "~/i18n/useLocale"
import { getLocale } from "~/i18n/locale.server"
import { useI18n } from "~/i18n/I18nProvider"
import { createTranslator } from "~/i18n/translate"

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
  // Explicit, so they're found under the app's base path (the browser's default
  // /favicon.ico is the domain root, outside the app). The SVG for browsers
  // that take it (sharp at any size), the .ico (16/32/48) for the rest.
  { rel: "icon", href: `${import.meta.env.BASE_URL}favicon.svg`, type: "image/svg+xml" },
  { rel: "icon", href: `${import.meta.env.BASE_URL}favicon.ico`, sizes: "48x48" },
  { rel: "apple-touch-icon", href: `${import.meta.env.BASE_URL}apple-touch-icon.png` },
]

export const meta: MetaFunction = () => {
  return [{ title: "Hotseat" }]
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
  const savedScheme = await schemeCookie.parse(request.headers.get("Cookie"))
  const scheme = isSchemeId(savedScheme) ? savedScheme : DEFAULT_SCHEME
  const locale = await getLocale(request)

  return { user, theme, scheme, locale }
}

export default function AppWithProvider() {
  const data = useLoaderData<typeof loader>()

  return (
    // The action path carries the app's base (/hotseat/): a bare /api/… would
    // post outside the app.
    <ThemeProvider
      specifiedTheme={data.theme}
      themeAction={`${import.meta.env.BASE_URL}api/set-theme`}
    >
      <SchemeProvider initialScheme={data.scheme}>
        <LocaleProvider initialLocale={data.locale}>
          <App />
        </LocaleProvider>
      </SchemeProvider>
    </ThemeProvider>
  )
}

const App = () => {
  const [theme] = useTheme()
  const [scheme] = useScheme()
  const { locale } = useI18n()
  const data = useLoaderData<typeof loader>()

  return (
    // "h-full" first: with no theme cookie, remix-themes' anti-flash script
    // APPENDS the system theme to the server's class ("h-full" → "h-full dark")
    // before hydration — the client must produce that exact string, or React
    // reports a hydration mismatch.
    <html
      lang={locale}
      className={clsx("h-full", theme)}
      data-scheme={scheme === DEFAULT_SCHEME ? undefined : scheme}
    >
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <ThemeColor scheme={scheme} theme={theme} />
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
 * The browser's colour round the page (a phone's status bar, its cutout):
 * the scheme's background in the chosen theme — or, following the system,
 * one for each.
 */
const ThemeColor = ({ scheme, theme }: { scheme: SchemeId; theme: string | null }) =>
  theme === "light" || theme === "dark" ? (
    <meta name="theme-color" content={getSchemeBackground(scheme, theme)} />
  ) : (
    <>
      <meta
        name="theme-color"
        media="(prefers-color-scheme: light)"
        content={getSchemeBackground(scheme, "light")}
      />
      <meta
        name="theme-color"
        media="(prefers-color-scheme: dark)"
        content={getSchemeBackground(scheme, "dark")}
      />
    </>
  )

/**
 * App-wide error page (404s from loaders, unexpected errors) in the app's own
 * style — instead of React Router's raw "Application Error" stack trace. The
 * error detail is shown only in development.
 */
export function ErrorBoundary() {
  const error = useRouteError()
  const data = useRouteLoaderData<typeof loader>("root")
  // Outside the providers: a translator of its own.
  const { t } = createTranslator(data?.locale)
  const notFound = isRouteErrorResponse(error) && error.status === 404
  const title = notFound ? t("Nothing here") : t("Something went wrong")
  const message = notFound
    ? // A loader's own reason ("Organization not found") — not the router's
      // raw "No route matches URL …" for an address that doesn't exist.
      typeof error.data === "string" && !error.data.startsWith("Error: No route matches")
      ? t("{reason}. It may have been removed, or you don't have access to it.", {
          reason: t(error.data),
        })
      : t("This page doesn't exist, or you don't have access to it.")
    : t("An unexpected error happened. Try again in a moment.")
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
    <html
      lang={data?.locale ?? "en"}
      className={clsx("h-full", data?.theme)}
      data-scheme={data?.scheme === DEFAULT_SCHEME ? undefined : data?.scheme}
      suppressHydrationWarning
    >
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <ThemeColor scheme={data?.scheme ?? DEFAULT_SCHEME} theme={data?.theme ?? null} />
        {!data?.theme && (
          <script
            dangerouslySetInnerHTML={{
              __html:
                "document.documentElement.classList.add(matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')",
            }}
          />
        )}
        <title>{`${title} · Hotseat`}</title>
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
              href={`${import.meta.env.BASE_URL}app`}
              className="mt-6 inline-flex rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground transition hover:brightness-105"
            >
              {t("Back to your offices")}
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
