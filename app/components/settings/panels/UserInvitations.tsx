import { Spinner } from "@heroui/react"
import dayjs from "dayjs"
import { Mail } from "lucide-react"
import pluralize from "pluralize"
import { SettingsCard } from "../ui"
import { useUserSettingsData } from "../data"
import { ButtonLink } from "~/components/ButtonLink"
import { ThumbAvatar } from "~/components/office/shell-ui"

export function UserInvitations() {
  // Loaded on the server with the page.
  const invitations = useUserSettingsData("invitations")?.invitations

  if (invitations === undefined)
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    )

  if (invitations.length === 0)
    return (
      <SettingsCard className="flex flex-col items-center gap-3 py-12 text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-accent/12 text-accent">
          <Mail className="size-6" />
        </span>
        <p className="font-black text-foreground">No invitations</p>
        <p className="max-w-xs text-sm text-muted">
          When someone invites you to their organization, it shows up here.
        </p>
      </SettingsCard>
    )

  return (
    <>
      {invitations.map((invitation) => {
        const org = invitation.organization
        return (
          <SettingsCard key={invitation.organizationSlug} className="flex items-center gap-4">
            <ThumbAvatar
              src={org.thumbnailUrl}
              fallback={org.name.slice(0, 1).toUpperCase()}
              className="size-14 shrink-0 rounded-2xl"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-black text-foreground">{org.name}</p>
              <p className="text-sm text-muted">
                {org.members.totalCount} {pluralize("member", org.members.totalCount)} · expires{" "}
                {dayjs(invitation.expiresAt).format("MMM D")}
              </p>
            </div>
            {/* Accepting = the email-invite confirm route (joins, then opens the org). */}
            <ButtonLink to={`/join/${invitation.organizationSlug}`} variant="primary" size="sm">
              Accept
            </ButtonLink>
          </SettingsCard>
        )
      })}
    </>
  )
}
