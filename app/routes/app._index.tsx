import clsx from "clsx"
import { useState, type FormEvent } from "react"
import { Form, Link, redirect, useLoaderData, useNavigate } from "react-router"
import { ArrowUpRight, Building2 } from "lucide-react"
import { Route } from "./+types/app._index"
import { requireUser } from "~/services/session.server"
import { getCore } from "~/core/get-core"
import { isSelfHosted } from "~/edition/edition.server"
import { HotseatLockup } from "~/components/HotseatMark"
import { CenteredScreen } from "~/components/ui/CenteredScreen"
import { ThumbAvatar } from "~/components/office/shell-ui"
import { revalidateOn } from "~/utils/revalidation"
import { useI18n } from "~/i18n/I18nProvider"
import { LINK_CLASS, ACTION_WORD_CLASS } from "~/components/ui/link"

export const loader = async ({ request }: Route.LoaderArgs) => {
  const user = await requireUser(request)
  const core = getCore()
  // In an organization: straight to their office (one hop).
  const landing = await core.user.landing(user.email)
  if (landing !== "/app") return redirect(landing)

  // Self-hosted: the company set up first; then in by their email's domain if
  // it's allowed — else waiting for an invite.
  const installation = isSelfHosted ? await core.installation.get() : null
  if (isSelfHosted && !installation) return redirect("/app/setup")
  if (isSelfHosted && (await core.installation.joinByDomain(user.email)))
    return redirect(await core.user.landing(user.email))

  // The user record, not the session: it follows a rename in Profile.
  const [current, invites] = await Promise.all([
    core.user.get(user.email),
    core.user.getOrganizationInvites(user.email),
  ])
  const name = current?.displayName ?? user.displayName
  return {
    firstName: name?.split(" ")[0] || user.email.split("@")[0],
    email: user.email as string,
    /** Self-hosted: the one company (they can only wait for its invite). */
    installationName: installation?.name ?? null,
    invitations: invites.map((invite) => ({
      slug: invite.organizationSlug,
      name: invite.organization.name,
      thumbnailUrl: invite.organization.thumbnailUrl,
    })),
  }
}

const AppIndex = () => {
  const { firstName, email, installationName, invitations } = useLoaderData<typeof loader>()
  const navigate = useNavigate()
  const { t } = useI18n()
  const [code, setCode] = useState("")

  // Accept either a pasted invite link or a bare org slug / slug-hash.
  const join = (e: FormEvent) => {
    e.preventDefault()
    const value = code.trim()
    if (!value) return
    try {
      const url = new URL(value)
      const idx = url.pathname.indexOf("/join/")
      if (idx !== -1) return navigate(url.pathname.slice(idx))
    } catch {
      // not a URL — fall through
    }
    navigate(`/join/${value.replace(/^\/+/, "").replace(/^join\//, "")}`)
  }

  return (
    <CenteredScreen>
      <div className="relative z-10 w-full max-w-xl text-center">
        <HotseatLockup size={44} />

        <h1 className="mt-5 text-5xl leading-[1.02] font-black tracking-[-0.03em]">
          {t("Welcome, {name}", { name: firstName })}
        </h1>
        <p className="mt-1 text-muted">
          {installationName
            ? t("You're not in {name} yet. Ask an admin there for an invite.", {
                name: installationName,
              })
            : t("Let's find you a workspace. Where do you belong?")}
        </p>

        {/* Invitations waiting for this email: the quickest way in. */}
        {invitations.length > 0 && (
          <ul className="mt-7 flex flex-col gap-2.5 text-left">
            {invitations.map((invitation) => (
              <li
                key={invitation.slug}
                className="flex items-center gap-3 rounded-2xl border border-accent/40 bg-surface p-4 shadow-surface"
              >
                <ThumbAvatar
                  src={invitation.thumbnailUrl}
                  fallback={invitation.name.slice(0, 1).toUpperCase()}
                  className="size-11 shrink-0 rounded-xl"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-accent">{t("You're invited")}</p>
                  <p className="truncate font-extrabold">{invitation.name}</p>
                </div>
                <Link
                  to={`/join/${invitation.slug}`}
                  prefetch="intent"
                  className="shrink-0 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground transition hover:brightness-105"
                >
                  {t("View invite")}
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className={clsx("mt-7 grid gap-3.5 text-left", !installationName && "sm:grid-cols-2")}>
          {/* Create (not self-hosted: one company there) */}
          {!installationName && (
            <div className="flex flex-col rounded-2xl border border-border bg-surface p-5 shadow-surface">
              <div className="grid size-10 place-items-center rounded-xl bg-accent/15 text-accent">
                <Building2 className="size-5" />
              </div>
              <h2 className="mt-3 text-xl font-black tracking-[-0.01em]">
                {t("Create an organization")}
              </h2>
              <p className="mt-0.5 text-sm text-muted">
                {t("Start fresh, design your office, and invite your team.")}
              </p>
              <Link
                to="?modal=new-organization"
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground transition hover:brightness-105"
              >
                {t("Create organization")}
              </Link>
            </div>
          )}

          {/* Join */}
          <div className="flex flex-col rounded-2xl border border-border bg-surface p-5 shadow-surface">
            <div className="grid size-10 place-items-center rounded-xl bg-success/15 text-success">
              <ArrowUpRight className="size-5" />
            </div>
            <h2 className="mt-3 text-xl font-black tracking-[-0.01em]">
              {t("Join with an invite")}
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              {t("Paste an invite link or code from a teammate.")}
            </p>
            <form onSubmit={join} className="mt-4 flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={t("Invite link or code")}
                className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none placeholder:text-muted focus-visible:border-accent"
              />
              <button
                type="submit"
                className="shrink-0 rounded-xl bg-accent/15 px-4 py-2.5 text-sm font-bold text-accent transition hover:bg-accent/25"
              >
                {t("Join")}
              </button>
            </form>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted">
          <span>{t("Signed in as {email}", { email })}</span>
          <Link to="?settings=user/profile" className={LINK_CLASS}>
            {t("Account settings")}
          </Link>
          <Form method="post" action="/logout">
            <button type="submit" className={ACTION_WORD_CLASS}>
              {t("Sign out")}
            </button>
          </Form>
        </div>
      </div>
    </CenteredScreen>
  )
}

export default AppIndex

// Opening a settings/create modal over this page doesn't change its data.
export const shouldRevalidate = revalidateOn()
