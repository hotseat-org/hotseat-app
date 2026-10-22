import { Avatar, AvatarFallback, Spinner } from "@heroui/react"
import dayjs from "dayjs"
import { Crown, SquareArrowRightExit } from "lucide-react"
import pluralize from "pluralize"
import { LeaveOrgDialog } from "../dialogs/LeaveOrg"
import { SettingsCard } from "../ui"
import { useSettings } from "../useSettings"
import { useUserSettingsData } from "../data"
import { ButtonLink } from "~/components/ButtonLink"
import { ThumbAvatar } from "~/components/office/shell-ui"
import { Button } from "~/components/Button"
import type { Profile } from "~/core/profile/types"

const roleLabels: Record<Profile["role"], string> = {
  ADMIN: "Admin",
  USER: "Member",
}

const getInitials = (name?: string) =>
  name
    ?.trim()
    .split(" ")
    .map((part) => part.toUpperCase()[0])
    .join("") ?? "?"

export function UserOrganizations() {
  const { dialog, openDialog } = useSettings()
  // Loaded on the server with the page; refreshed after leaving one.
  const organizations = useUserSettingsData("organizations")?.organizations
  const leaveSlug = dialog?.startsWith("leave:") ? dialog.slice("leave:".length) : undefined

  return (
    <>
      {organizations === undefined ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : organizations.length === 0 ? (
        <SettingsCard className="py-10 text-center text-sm text-muted">
          You&apos;re not a member of any organization yet.
        </SettingsCard>
      ) : (
        organizations.map((organization) => {
          const isAdmin = organization.profile.role === "ADMIN"
          return (
            <SettingsCard key={organization.slug} className="flex flex-wrap items-center gap-4">
              <ThumbAvatar
                src={organization.thumbnailUrl}
                fallback={organization.name.slice(0, 1).toUpperCase()}
                className="size-14 shrink-0 rounded-2xl sm:size-16"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-black text-foreground">{organization.name}</p>
                  <span
                    className={
                      isAdmin
                        ? "flex shrink-0 items-center gap-1 rounded-full bg-accent/12 px-2 py-0.5 text-[0.68rem] font-bold text-accent"
                        : "shrink-0 rounded-full bg-foreground/5 px-2 py-0.5 text-[0.68rem] font-bold text-muted"
                    }
                  >
                    {isAdmin && <Crown className="size-3" />}
                    {roleLabels[organization.profile.role]}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex -space-x-1.5">
                    {organization.members.data.map((member) => (
                      <Avatar
                        key={member.userEmail}
                        size="sm"
                        className="size-6 ring-2 ring-surface"
                      >
                        <Avatar.Image src={member.avatarUrl} alt={member.displayName} />
                        <AvatarFallback className="text-[0.6rem]">
                          {getInitials(member.displayName)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  <span className="text-xs text-muted">
                    {organization.members.totalCount}{" "}
                    {pluralize("member", organization.members.totalCount)} · joined{" "}
                    {dayjs(organization.profile.createdAt).format("MMM D, YYYY")}
                  </span>
                </div>
              </div>
              <div className="flex w-full shrink-0 justify-end gap-2 sm:w-auto">
                <ButtonLink to={`/app/o/${organization.slug}`} variant="secondary" size="sm">
                  Open
                </ButtonLink>
                <Button
                  onPress={() => openDialog(`leave:${organization.slug}`)}
                  size="sm"
                  variant="danger-soft"
                >
                  <SquareArrowRightExit size={16} />
                  Leave
                </Button>
              </div>
            </SettingsCard>
          )
        })
      )}

      {leaveSlug && <LeaveOrgDialog slug={leaveSlug} />}
    </>
  )
}
