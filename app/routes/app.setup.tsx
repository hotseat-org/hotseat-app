import { Form, redirect, useActionData, useLoaderData, useNavigation } from "react-router"
import { z } from "zod"
import { Route } from "./+types/app.setup"
import { HotseatLockup } from "~/components/HotseatMark"
import { CenteredScreen } from "~/components/ui/CenteredScreen"
import { getCore } from "~/core/get-core"
import { parseDomains } from "~/core/installation"
import { getSetupAdmins, maySetUp, requireSelfHosted } from "~/edition/edition.server"
import { useI18n } from "~/i18n/I18nProvider"
import { msg } from "~/i18n/msg"
import { requireUser } from "~/services/session.server"

/** Mail services anyone can sign up to: never suggested as "who can join". */
const PUBLIC_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "yahoo.com",
  "icloud.com",
  "me.com",
  "proton.me",
  "protonmail.com",
  "seznam.cz",
  "email.cz",
  "centrum.cz",
  "post.cz",
])

const MAX_NAME = 60

const schema = z.object({
  name: z.string().trim().min(1).max(MAX_NAME),
  domains: z.string().max(1000),
})

/**
 * A self-hosted installation's first run: whoever sets it up names the company
 * and says whose emails get in. Everyone else is told it isn't ready yet.
 */
export const loader = async ({ request }: Route.LoaderArgs) => {
  requireSelfHosted()

  const user = await requireUser(request)
  const core = getCore()
  // Set up already: nothing to do here.
  if (await core.installation.get()) return redirect(await core.user.landing(user.email))

  const domain = user.email.slice(user.email.lastIndexOf("@") + 1).toLowerCase()

  return {
    canSetUp: maySetUp(user.email),
    admins: getSetupAdmins(),
    suggestedDomains: PUBLIC_DOMAINS.has(domain) ? "" : domain,
  }
}

export const action = async ({ request }: Route.ActionArgs) => {
  requireSelfHosted()

  const user = await requireUser(request)
  if (!maySetUp(user.email)) throw new Response(null, { status: 403 })

  const parsed = schema.safeParse(Object.fromEntries(await request.formData()))
  if (!parsed.success) return { error: msg("Give the company a name.") }

  const core = getCore()
  const organization = await core.installation
    .setUp({
      userEmail: user.email,
      name: parsed.data.name,
      allowedDomains: parseDomains(parsed.data.domains),
    })
    .catch(() => null)
  if (!organization)
    return { error: msg("It's been set up already, or that name won't do. Reload and try again.") }

  // Its offices: the empty one offers to draw the first, or start from a template.
  return redirect(`/app/o/${organization.slug}/offices`)
}

const FIELD =
  "w-full rounded-xl border border-border bg-surface px-3.5 py-3 text-[15px] outline-none placeholder:text-muted focus-visible:border-accent"

const Setup = () => {
  const { canSetUp, admins, suggestedDomains } = useLoaderData<typeof loader>()
  const result = useActionData<typeof action>()
  const isSaving = useNavigation().state === "submitting"
  const { t } = useI18n()

  return (
    <CenteredScreen>
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center">
          <HotseatLockup size={44} />
        </div>

        {canSetUp ? (
          <Form
            method="post"
            className="mt-7 rounded-2xl border border-border bg-surface p-6 shadow-surface"
          >
            <h1 className="text-2xl font-extrabold tracking-tight">{t("Set up Hotseat")}</h1>
            <p className="mt-1 text-muted">
              {t("Two things, and you can change both later in the settings.")}
            </p>

            <label className="mt-6 block">
              <span className="text-sm font-bold">{t("Company name")}</span>
              <input
                name="name"
                required
                maxLength={MAX_NAME}
                autoFocus
                placeholder={t("Acme")}
                className={`${FIELD} mt-1.5`}
              />
            </label>

            <label className="mt-5 block">
              <span className="text-sm font-bold">{t("Who can join")}</span>
              <input
                name="domains"
                defaultValue={suggestedDomains}
                placeholder="acme.com, acme.cz"
                className={`${FIELD} mt-1.5`}
              />
              <span className="mt-1.5 block text-sm text-muted">
                {t(
                  "Anyone signing in with an email at these domains joins straight away. Leave it empty to invite people yourself."
                )}
              </span>
            </label>

            {result?.error && (
              <p role="alert" className="mt-4 text-sm font-semibold text-danger">
                {t(result.error)}
              </p>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="mt-6 w-full rounded-xl bg-accent px-4 py-3 text-[15px] font-bold text-accent-foreground transition hover:brightness-105 disabled:opacity-60"
            >
              {isSaving ? t("Setting up…") : t("Set up")}
            </button>
          </Form>
        ) : (
          <div className="mt-7 rounded-2xl border border-border bg-surface p-6 text-center shadow-surface">
            <h1 className="text-2xl font-extrabold tracking-tight">
              {t("Hotseat isn't set up yet")}
            </h1>
            <p className="mt-2 text-muted">
              {t("{admins} sets it up on their first sign-in. Come back after that.", {
                admins: admins.join(", "),
              })}
            </p>
            <Form method="post" action="/logout" className="mt-5">
              <button type="submit" className="text-sm font-bold text-accent hover:underline">
                {t("Sign out")}
              </button>
            </Form>
          </div>
        )}
      </div>
    </CenteredScreen>
  )
}

export default Setup
