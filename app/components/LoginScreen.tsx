import clsx from "clsx"
import { useEffect, useState, type CSSProperties } from "react"
import { KeyRound } from "lucide-react"
import { Form, useRouteLoaderData, useSearchParams } from "react-router"
import { DUSK, HotseatLockup } from "~/components/HotseatMark"
import { useI18n } from "~/i18n/I18nProvider"
import { LOCALES, LOCALE_NAMES } from "~/i18n/locales"
import { useLocale } from "~/i18n/useLocale"
import type { loader as rootLoader } from "~/root"
import type { SignInProvider } from "~/services/signIn"
import type { PageColor } from "~/utils/pageColor"

/** The languages, each in itself — for someone not signed in yet. */
const LanguageSwitch = () => {
  const [locale, pickLocale] = useLocale()
  return (
    <div className="flex gap-1 text-[13px] font-bold">
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={l === locale}
          onClick={() => pickLocale(l)}
          className={clsx(
            "rounded-full px-3 py-1.5 transition-colors",
            l === locale ? "bg-[#fbf6ee]/15 text-[#f4efe6]" : "text-[#9aa1c0] hover:text-[#f4efe6]"
          )}
        >
          {LOCALE_NAMES[l]}
        </button>
      ))}
    </div>
  )
}

/** The page's night blue (a step darker than the mark's tile, so it stands on it). */
const NIGHT = "#1f2850"

/** The login screen's own colour, whatever the colour scheme: round the page on a phone too. */
export const LOGIN_PAGE_COLOR: PageColor = { background: NIGHT, isDark: true }

/**
 * The three horizon lines (the logo's, across the whole screen), each as the
 * y's of one curve: start, three control points, the smooth join and the end.
 * They slowly breathe between a few gentle shapes, out of step with each other.
 */
const HORIZON = [
  { color: DUSK.lines[0], y: [650, 560, 540, 600, 700, 650], seconds: 19 },
  { color: DUSK.lines[1], y: [742, 640, 618, 686, 800, 744], seconds: 23 },
  { color: DUSK.lines[2], y: [834, 720, 696, 772, 900, 838], seconds: 27 },
]
/** How each breath bends a line: offsets for the control points, and a sideways sway. */
const BREATHS = [
  { dy: [0, 0, 0, 0, 0, 0], dx: 0 },
  { dy: [6, -16, 10, -14, 10, 4], dx: 40 },
  { dy: [-4, 12, -14, 10, -12, -6], dx: -30 },
]
const curve = (y: number[], { dy, dx }: (typeof BREATHS)[number]) =>
  `M-40 ${y[0] + dy[0]}C${240 + dx} ${y[1] + dy[1]} ${520 + dx} ${y[2] + dy[2]} ${820 + dx} ${y[3] + dy[3]}S1300 ${y[4] + dy[4]} 1500 ${y[5] + dy[5]}`

/** Faint contours higher up the slope, drifting very slowly. */
const CONTOURS = [
  "M-40 300C260 230 560 230 860 280S1320 360 1500 320",
  "M-40 380C260 300 560 300 860 355S1320 440 1500 400",
  "M-40 460C260 372 560 372 860 432S1320 520 1500 480",
]
const STARS = [
  [180, 90, 1.4],
  [420, 150, 1],
  [690, 70, 1.6],
  [980, 130, 1.1],
  [1230, 80, 1.5],
  [1340, 210, 1],
  [90, 230, 1],
  [560, 210, 0.9],
]

/** Motion unless the system asks for less (decided on the client; still on the server). */
const useIsAnimated = () => {
  const [isAnimated, setIsAnimated] = useState(false)
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setIsAnimated(!query.matches)
    update()
    query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
  }, [])
  return isAnimated
}

/** The night sky behind everything: stars and a faint slope of contours. */
const NightSky = ({ isAnimated }: { isAnimated: boolean }) => (
  <svg
    aria-hidden
    viewBox="0 0 1440 900"
    preserveAspectRatio="xMidYMin slice"
    fill="none"
    className="pointer-events-none absolute inset-0 size-full"
  >
    <g stroke="#2e3a6c" strokeWidth={1.5}>
      {isAnimated && (
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0 0; -36 6; 0 0"
          dur="60s"
          repeatCount="indefinite"
          calcMode="spline"
          keySplines="0.45 0 0.55 1; 0.45 0 0.55 1"
        />
      )}
      {CONTOURS.map((d) => (
        <path key={d} d={d} />
      ))}
    </g>
    <g fill="#f4efe6">
      {STARS.map(([x, y, r], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={r}
          className="opacity-60 motion-safe:animate-[twinkle_var(--duration)_ease-in-out_var(--delay)_infinite]"
          style={
            { "--duration": `${3 + (i % 4)}s`, "--delay": `${(i * 0.7) % 3}s` } as CSSProperties
          }
        />
      ))}
    </g>
  </svg>
)

/**
 * The three warm lines, as a band along the bottom of the page — in the flow,
 * so whatever the screen's height they never run over the buttons above.
 */
const Horizon = ({ isAnimated }: { isAnimated: boolean }) => (
  <svg
    aria-hidden
    viewBox="0 500 1440 400"
    preserveAspectRatio="xMidYMin slice"
    fill="none"
    strokeLinecap="round"
    className="pointer-events-none relative h-[clamp(170px,32vh,340px)] w-full shrink-0"
  >
    {HORIZON.map(({ color, y, seconds }, i) => (
      <path key={color} d={curve(y, BREATHS[0])} stroke={color} strokeWidth={30}>
        {isAnimated && (
          <animate
            attributeName="d"
            values={[...BREATHS, BREATHS[0]].map((b) => curve(y, b)).join(";")}
            keyTimes="0;0.33;0.66;1"
            calcMode="spline"
            keySplines="0.45 0 0.55 1; 0.45 0 0.55 1; 0.45 0 0.55 1"
            dur={`${seconds}s`}
            begin={`${-i * 5}s`}
            repeatCount="indefinite"
          />
        )}
      </path>
    ))}
  </svg>
)

/** A sign-in button's icon and words. */
const ProviderLabel = ({ provider }: { provider: SignInProvider }) => {
  const { t } = useI18n()

  if (provider.kind === "google")
    return (
      <>
        <span className="iconify-color devicon--google" />
        {t("Continue with Google")}
      </>
    )
  if (provider.kind === "github")
    return (
      <>
        <span className="iconify devicon--github" />
        {t("Continue with GitHub")}
      </>
    )

  return (
    <>
      <KeyRound className="size-5" />
      {provider.name
        ? t("Continue with {name}", { name: provider.name })
        : t("Continue with single sign-on")}
    </>
  )
}

const BUTTON =
  "flex h-[52px] w-full cursor-pointer items-center justify-center gap-2.5 rounded-full text-base font-extrabold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f6c560]"

/**
 * The sign-in screen — the /login page, and what the join pages show to
 * someone signed out. (A plain component: a route's default export is wrapped
 * by React Router and ignores props passed to it, so it can't be reused.)
 * Always at dusk, whatever the theme: it's the brand's moment.
 */
export function LoginScreen({
  redirectTo,
  title,
  subtitle,
}: {
  redirectTo?: string
  /** E.g. "Join Acme" when signing in from an invitation. */
  title?: string
  subtitle?: string
} = {}) {
  const [searchParams] = useSearchParams()
  // Where to land after auth: an explicit prop (e.g. from the invite screen),
  // else a ?redirectTo query, else the auth default ("/").
  const target = redirectTo ?? searchParams.get("redirectTo") ?? undefined
  // The ways to sign in this server offers.
  const providers = useRouteLoaderData<typeof rootLoader>("root")?.signIn ?? []
  const isAnimated = useIsAnimated()
  const { t } = useI18n()

  return (
    <main
      className="relative flex min-h-dvh w-full flex-col overflow-hidden text-[#f4efe6]"
      style={{ background: NIGHT }}
    >
      <NightSky isAnimated={isAnimated} />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-7">
        <HotseatLockup size={40} />
        <LanguageSwitch />
      </header>

      <section className="relative z-10 flex flex-1 flex-col items-center justify-center gap-5 px-6 py-6 text-center">
        <h1 className="max-w-2xl text-[clamp(36px,6vw,56px)] leading-[1.05] font-black tracking-[-0.02em]">
          {title ?? t("Find your seat.")}
        </h1>
        <p className="max-w-md text-lg text-[#c9cde0]">
          {subtitle ??
            t("Book a desk, see who's in, and walk into an office that's ready for you.")}
        </p>
        <div className="mt-2 flex w-full max-w-[360px] flex-col gap-3">
          {providers.map((provider, index) => (
            <Form key={provider.id} method="get" action={`/auth/${provider.id}`}>
              {target && <input type="hidden" name="redirectTo" value={target} />}
              <button
                type="submit"
                // The first is the main way in; the rest are outlined.
                className={clsx(
                  BUTTON,
                  index === 0
                    ? "bg-[#fbf6ee] text-[#2c3866] hover:bg-white"
                    : "border-[1.5px] border-[#4a5688] bg-[#1f2850]/60 text-[#f4efe6] hover:border-[#7d88b8]"
                )}
              >
                <ProviderLabel provider={provider} />
              </button>
            </Form>
          ))}
          {providers.length === 0 && (
            <p className="rounded-2xl border border-[#4a5688] px-4 py-3 text-sm text-[#c9cde0]">
              {t("No way to sign in is set up on this server yet.")}
            </p>
          )}
        </div>
        <p className="text-[13px] text-[#9aa1c0]">
          {t("New here? Signing in creates your account.")}
        </p>
      </section>

      <Horizon isAnimated={isAnimated} />
    </main>
  )
}
