import clsx from "clsx"
import { useState } from "react"
import { Form, redirect, useActionData, useLoaderData, useNavigation } from "react-router"
import { z } from "zod"
import { Route } from "./+types/app.setup"
import { HotseatLockup } from "~/components/HotseatMark"
import { CenteredScreen } from "~/components/ui/CenteredScreen"
import { getCore } from "~/core/get-core"
import { parseDomains } from "~/core/installation"
import { ExportFileError, readExportFile } from "~/core/transfer"
import { getSetupAdmins, maySetUp, requireSelfHosted } from "~/edition/edition.server"
import { useI18n } from "~/i18n/I18nProvider"
import { msg } from "~/i18n/msg"
import { requireUser } from "~/services/session.server"
import { ACTION_WORD_CLASS } from "~/components/ui/link"

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

  const form = await request.formData()
  if (form.get("intent") === "import") return importCopy(user.email, form)

  const parsed = schema.safeParse(Object.fromEntries(form))
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

/** Set up from an organization's copy (Settings → General → Take a copy, on another Hotseat). */
const importCopy = async (userEmail: string, form: FormData) => {
  const upload = form.get("file")
  if (!(upload instanceof File) || upload.size === 0)
    return { error: msg("Choose the file you downloaded.") }

  const file = await readExportFile(upload).catch((error: unknown) => {
    if (error instanceof ExportFileError) return error
    throw error
  })
  if (file instanceof ExportFileError)
    return {
      error: file.isNewer
        ? msg("That copy is from a newer Hotseat. Update this one first, then import it.")
        : msg("That isn't a Hotseat copy. Download one in Settings → General → Take a copy."),
    }

  const domains = String(form.get("domains") ?? "")
  const imported = await getCore()
    .installation.importOrganization({
      file,
      userEmail,
      allowedDomains: parseDomains(domains),
    })
    .catch((error: unknown) => {
      console.error("Import failed", error)

      return null
    })
  if (!imported)
    return {
      error: msg("It's been set up already, or that copy won't go in. Nothing was changed."),
    }

  return redirect(`/app/o/${imported.slug}/offices`)
}

const FIELD =
  "w-full rounded-xl border border-border bg-surface px-3.5 py-3 text-[15px] outline-none placeholder:text-muted focus-visible:border-accent"

const SUBMIT =
  "mt-6 w-full rounded-xl bg-accent px-4 py-3 text-[15px] font-bold text-accent-foreground transition hover:brightness-105 disabled:opacity-60"

/** Whose emails get in on their own: one line of domains. */
const DomainsField = ({ suggestedDomains }: { suggestedDomains: string }) => {
  const { t } = useI18n()

  return (
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
  )
}

/**
 * Set up from a copy of an organization (downloaded from its settings on
 * another Hotseat): its offices, people, teams and bookings, as they were.
 */
const ImportForm = ({
  suggestedDomains,
  error,
  isSaving,
  onCancel,
}: {
  suggestedDomains: string
  error?: string
  isSaving: boolean
  onCancel: () => void
}) => {
  const { t } = useI18n()

  return (
    <Form
      method="post"
      encType="multipart/form-data"
      className="mt-7 rounded-2xl border border-border bg-surface p-6 shadow-surface"
    >
      <input type="hidden" name="intent" value="import" />
      <h1 className="text-2xl font-extrabold tracking-tight">{t("Start from a copy")}</h1>
      <p className="mt-1 text-muted">
        {t(
          "The file from Settings → General → Take a copy. Everyone signs in with the same email as before and finds their desks, teams and bookings."
        )}
      </p>

      <label className="mt-6 block">
        <span className="text-sm font-bold">{t("File")}</span>
        <input
          type="file"
          name="file"
          required
          accept=".gz,.json,application/gzip,application/json"
          className={`${FIELD} mt-1.5 file:mr-3 file:border-0 file:bg-transparent file:font-bold file:text-foreground`}
        />
      </label>

      <DomainsField suggestedDomains={suggestedDomains} />

      {error && (
        <p role="alert" className="mt-4 text-sm font-semibold text-danger">
          {t(error)}
        </p>
      )}

      <button type="submit" disabled={isSaving} className={SUBMIT}>
        {isSaving ? t("Importing…") : t("Import")}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className={clsx("mt-4 block w-full text-center", ACTION_WORD_CLASS)}
      >
        {t("Set up from scratch instead")}
      </button>
    </Form>
  )
}

const Setup = () => {
  const { canSetUp, admins, suggestedDomains } = useLoaderData<typeof loader>()
  const result = useActionData<typeof action>()
  const isSaving = useNavigation().state === "submitting"
  const { t } = useI18n()
  const [isImporting, setIsImporting] = useState(false)

  return (
    <CenteredScreen>
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center">
          <HotseatLockup size={44} />
        </div>

        {canSetUp && isImporting ? (
          <ImportForm
            suggestedDomains={suggestedDomains}
            error={result?.error}
            isSaving={isSaving}
            onCancel={() => setIsImporting(false)}
          />
        ) : canSetUp ? (
          <>
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

              <DomainsField suggestedDomains={suggestedDomains} />

              {result?.error && (
                <p role="alert" className="mt-4 text-sm font-semibold text-danger">
                  {t(result.error)}
                </p>
              )}

              <button type="submit" disabled={isSaving} className={SUBMIT}>
                {isSaving ? t("Setting up…") : t("Set up")}
              </button>
            </Form>

            <p className="mt-5 text-center text-muted">
              {t("Moving from the hosted Hotseat?")}{" "}
              <button
                type="button"
                onClick={() => setIsImporting(true)}
                className={ACTION_WORD_CLASS}
              >
                {t("Start from a copy")}
              </button>
            </p>
          </>
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
              <button type="submit" className={clsx("text-sm", ACTION_WORD_CLASS)}>
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
