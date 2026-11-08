import { Building2 } from "lucide-react"
import type { ReactNode } from "react"
import { Form, Link, useNavigation } from "react-router"
import { CenteredScreen } from "~/components/ui/CenteredScreen"
import { useI18n } from "~/i18n/I18nProvider"

export interface JoinOrganization {
  name: string
  description?: string
  thumbnailUrl?: string
}

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")

const OrganizationBadge = ({ organization }: { organization: JoinOrganization }) =>
  organization.thumbnailUrl ? (
    <img
      src={organization.thumbnailUrl}
      alt=""
      className="mx-auto size-14 rounded-2xl object-cover"
    />
  ) : (
    <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent/15 text-xl font-black text-accent">
      {initials(organization.name) || <Building2 className="size-6" />}
    </div>
  )

/**
 * Joining an organization — the same screen for an email invitation
 * (`/join/:slug`) and the universal link (`/join/:slug/:hash`): who's inviting,
 * then Decline / Accept (posted to the route's action as `intent`).
 */
export const JoinCard = ({ organization }: { organization: JoinOrganization }) => {
  const navigation = useNavigation()
  const isJoining = navigation.state !== "idle" && navigation.formData?.get("intent") === "accept"
  const { t } = useI18n()

  return (
    <CenteredScreen>
      {/* The paper, no card: the invitation as a headline. */}
      <div className="relative z-10 w-full max-w-md rounded-[36px] bg-background p-8 text-center">
        <OrganizationBadge organization={organization} />
        <p className="mt-4 text-sm text-muted">{t("You've been invited to join")}</p>
        <h1 className="mt-1 text-[clamp(40px,5vw,56px)] leading-[0.95] font-black tracking-[-0.035em]">
          {organization.name}
        </h1>
        {organization.description && (
          <p className="mt-1 text-sm text-muted">{organization.description}</p>
        )}

        <div className="mt-8 flex items-center justify-center gap-6">
          <Form method="post">
            <input type="hidden" name="intent" value="decline" />
            {/* A word: the way out, not a second button. */}
            <button
              type="submit"
              className="min-h-11 px-1 text-base font-extrabold text-foreground underline decoration-2 underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              {t("Decline")}
            </button>
          </Form>
          <Form method="post">
            <input type="hidden" name="intent" value="accept" />
            <button
              type="submit"
              disabled={isJoining}
              className="h-14 min-w-44 rounded-full bg-foreground px-7 text-lg font-black text-background transition-opacity outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-60"
            >
              {isJoining ? t("Joining…") : t("Accept invite")}
            </button>
          </Form>
        </div>
      </div>
    </CenteredScreen>
  )
}

/** Why joining can't happen (expired, no invitation, unknown link) — and a way back. */
export const JoinProblem = ({ title, children }: { title: string; children: ReactNode }) => {
  const { t } = useI18n()
  return (
    <CenteredScreen>
      <div className="relative z-10 max-w-sm text-center">
        <h1 className="text-[clamp(40px,5vw,56px)] leading-[0.95] font-black tracking-[-0.035em]">
          {title}
        </h1>
        <p className="mt-3 text-xl leading-snug font-extrabold text-muted">{children}</p>
        <Link
          to="/app"
          prefetch="intent"
          className="mt-8 inline-flex h-14 items-center rounded-full bg-foreground px-7 text-lg font-black text-background transition-opacity outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-focus"
        >
          {t("Back to Hotseat")}
        </Link>
      </div>
    </CenteredScreen>
  )
}
