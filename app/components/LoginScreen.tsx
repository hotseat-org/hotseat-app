import clsx from "clsx"
import { ArrowLeft, KeyRound } from "lucide-react"
import { Form, Link, useRouteLoaderData, useSearchParams } from "react-router"
import { HotseatLockup } from "~/components/HotseatMark"
import { Horizon, NIGHT, NightSky, useIsAnimated } from "~/components/NightScene"
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

/** The login screen's own colour, whatever the colour scheme: round the page on a phone too. */
export const LOGIN_PAGE_COLOR: PageColor = { background: NIGHT, isDark: true }

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
  const root = useRouteLoaderData<typeof rootLoader>("root")
  const providers = root?.signIn ?? []
  // The hosted service's product page, to go back to (a company's own installation has none).
  const hasProductPage = root?.edition === "saas"
  const isAnimated = useIsAnimated()
  const { t } = useI18n()

  return (
    <main
      className="relative flex min-h-dvh w-full flex-col overflow-hidden text-[#f4efe6]"
      style={{ background: NIGHT }}
    >
      <NightSky isAnimated={isAnimated} />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-7">
        {hasProductPage ? (
          <Link
            to="/"
            aria-label={t("Back to Hotseat")}
            className="group -ml-2 flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2 outline-none focus-visible:outline-2 focus-visible:outline-[#f6c560]"
          >
            <ArrowLeft className="size-5 text-[#9aa1c0] transition-transform group-hover:-translate-x-0.5 group-hover:text-[#f4efe6]" />
            <HotseatLockup size={40} />
          </Link>
        ) : (
          <HotseatLockup size={40} />
        )}
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
