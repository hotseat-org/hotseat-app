import { Building2 } from "lucide-react"
import type { ReactNode } from "react"
import { Form, Link, useNavigation } from "react-router"
import { CenteredScreen } from "~/components/ui/CenteredScreen"

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
    <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-accent to-brand text-xl font-black text-white">
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

  return (
    <CenteredScreen>
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-surface p-8 text-center shadow-overlay">
        <OrganizationBadge organization={organization} />
        <p className="mt-4 text-sm text-muted">You&apos;ve been invited to join</p>
        <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight">{organization.name}</h1>
        {organization.description && (
          <p className="mt-1 text-sm text-muted">{organization.description}</p>
        )}

        <div className="mt-6 flex gap-2.5">
          <Form method="post" className="flex-1">
            <input type="hidden" name="intent" value="decline" />
            <button
              type="submit"
              className="w-full rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-foreground transition hover:bg-foreground/5"
            >
              Decline
            </button>
          </Form>
          <Form method="post" className="flex-1">
            <input type="hidden" name="intent" value="accept" />
            <button
              type="submit"
              disabled={isJoining}
              className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground transition hover:brightness-105 disabled:opacity-60"
            >
              {isJoining ? "Joining…" : "Accept invite"}
            </button>
          </Form>
        </div>
      </div>
    </CenteredScreen>
  )
}

/** Why joining can't happen (expired, no invitation, unknown link) — and a way back. */
export const JoinProblem = ({ title, children }: { title: string; children: ReactNode }) => (
  <CenteredScreen>
    <div className="relative z-10 max-w-sm text-center">
      <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
      <p className="mt-2 text-muted">{children}</p>
      <Link
        to="/app"
        className="mt-6 inline-flex rounded-xl bg-accent/15 px-4 py-2.5 text-sm font-bold text-accent hover:bg-accent/25"
      >
        Back to Hotseat
      </Link>
    </div>
  </CenteredScreen>
)
