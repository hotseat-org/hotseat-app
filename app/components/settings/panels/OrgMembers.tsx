import { Dropdown, Spinner } from "@heroui/react"
import {
  ChevronUp,
  ChevronsUp,
  CornerUpLeft,
  FileUp,
  Search,
  UserMinus,
  UsersRound,
} from "lucide-react"
import { useMemo, useState } from "react"
import { useFetcher, useParams } from "react-router"
import { useSettings } from "../useSettings"
import { useOrgSettingsData } from "../data"
import { ImportMembersDialog } from "../dialogs/ImportMembers"
import { RemoveMemberDialog } from "../dialogs/RemoveMember"
import { MemberTeamsDialog, type MemberTeam } from "../dialogs/MemberTeams"
import { useIsHydrated } from "~/utils/hooks/useIsHydrated"
import { useOrganizationContext } from "~/utils/hooks/useProfileData"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"
import { roleLabel } from "~/components/office/shell-ui"
import { Button } from "~/components/Button"
import { isFound, toSearchable } from "~/components/people/PeopleSearch"
import { useProgressiveList } from "~/utils/hooks/useProgressiveList"
import { Rich, useI18n } from "~/i18n/I18nProvider"
import { TeamChip } from "~/components/teams/teamLook"
import { LINK_CLASS } from "~/components/ui/link"

/** Manage, as a word (the headline's links). */
const MANAGE =
  "inline-flex min-h-11 cursor-pointer items-center px-1 text-base font-extrabold text-foreground underline decoration-2 underline-offset-[5px]"

export function OrgMembers() {
  const { selectSection, dialog, openDialog } = useSettings()
  const { t } = useI18n()

  // Loaded on the server with the page; refreshed after a role change.
  const settings = useOrgSettingsData("members")
  const members = settings?.members
  const teams = useMemo(() => settings?.memberTeams ?? [], [settings?.memberTeams])
  // Each member's teams, by their email.
  const teamsByEmail = useMemo(() => {
    const byEmail = new Map<string, MemberTeam[]>()
    for (const team of teams)
      for (const email of team.members) byEmail.set(email, [...(byEmail.get(email) ?? []), team])

    return byEmail
  }, [teams])
  // Hundreds of people: found by name or email, drawn a page at a time.
  const [query, setQuery] = useState("")
  const searched = toSearchable(query.trim())
  const found = (members?.data ?? []).filter((member) =>
    isFound({ email: member.userEmail, name: member.displayName ?? "" }, searched)
  )
  const pages = useProgressiveList(found, query)
  const choosingTeams = dialog?.startsWith("teams:")
    ? members?.data.find((m) => m.userEmail === dialog.slice("teams:".length))
    : undefined
  const removing = dialog?.startsWith("remove:")
    ? members?.data.find((m) => m.userEmail === dialog.slice("remove:".length))
    : undefined

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-base font-bold text-muted">
            <Rich
              text={t("To add new members, {invite} them.")}
              values={{
                invite: (
                  <button
                    type="button"
                    onClick={() => selectSection("invitations")}
                    className={LINK_CLASS}
                  >
                    {t("invite")} <CornerUpLeft strokeWidth={4} className="inline" size={14} />
                  </button>
                ),
              }}
            />
          </p>
          {members && (
            <Button size="sm" variant="secondary" onPress={() => openDialog("import")}>
              <FileUp className="size-4" /> {t("Import people")}
            </Button>
          )}
        </div>

        {members === undefined ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : members === null ? (
          <p className="text-sm text-muted">{t("Only admins can see and manage members.")}</p>
        ) : (
          <>
            {/* A line to write on, not a box (the headline's search). */}
            <label className="flex h-14 items-center gap-3 border-b-2 border-foreground px-1 focus-within:border-accent">
              <Search className="size-5 shrink-0 text-foreground" strokeWidth={2.2} />
              <input
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
                placeholder={t("Search by name or email")}
                aria-label={t("Search by name or email")}
                className="min-w-0 flex-1 bg-transparent text-xl font-extrabold text-foreground outline-none placeholder:font-bold placeholder:text-muted"
              />
            </label>
            {/* One ruled line a person (the headline's lists): who, their email and
                teams under the name, their role, and Manage. */}
            <ul
              aria-label={t("Members")}
              className="flex flex-col divide-y divide-separator border-y border-separator"
            >
              {pages.shown.map((member) => (
                <li key={member.userEmail} className="flex items-center gap-4 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xl leading-tight font-black tracking-[-0.01em] text-foreground">
                      {member.displayName ?? member.userEmail.split("@")[0]}
                    </p>
                    <p className="truncate text-sm font-semibold text-muted">{member.userEmail}</p>
                    <MemberTeamChips teams={teamsByEmail.get(member.userEmail)} />
                  </div>
                  <RoleWord role={member.role} />
                  <ManageMenu member={member} />
                </li>
              ))}
            </ul>
            {/* More coming: drawn as this nears the end of the scroll. */}
            {pages.hasMore && <div ref={pages.endRef} aria-hidden className="h-12" />}
            {found.length === 0 && (
              <p className="py-6 text-center text-sm text-muted">
                {t("Nobody matches “{query}”", { query: query.trim() })}
              </p>
            )}
          </>
        )}
      </div>
      {removing && (
        <RemoveMemberDialog
          email={removing.userEmail}
          name={removing.displayName ?? removing.userEmail}
        />
      )}
      {choosingTeams && (
        <MemberTeamsDialog
          email={choosingTeams.userEmail}
          name={choosingTeams.displayName ?? choosingTeams.userEmail}
          teams={teams}
        />
      )}
      {dialog === "import" && members && (
        <ImportMembersDialog
          memberEmails={new Set(members.data.map((member) => member.userEmail.toLowerCase()))}
        />
      )}
    </div>
  )
}

type Member = { userEmail: string; displayName?: string; role: Role }

/** Someone's teams, as small chips (none: nothing). */
const MemberTeamChips = ({ teams }: { teams?: MemberTeam[] }) =>
  teams?.length ? (
    <span className="mt-1 flex flex-wrap gap-1">
      {teams.map((team) => (
        <TeamChip
          key={team.id}
          name={team.name}
          color={team.color}
          className="h-6 px-2 text-[11px]"
        />
      ))}
    </span>
  ) : null

/** Their role as a word: an admin's in the scheme's colour. */
const RoleWord = ({ role }: { role: Role }) => {
  const i18n = useI18n()
  const isAdmin = role === Role.ADMIN

  return (
    <span
      className={`shrink-0 text-base font-extrabold capitalize ${isAdmin ? "text-accent" : "text-muted"}`}
    >
      {roleLabel(i18n, role)}
    </span>
  )
}

/** Make admin / user, or remove — the "Manage" menu for one member. */
const ManageMenu = ({ member }: { member: Member }) => {
  const { slug } = useParams()
  const { openDialog } = useSettings()
  const { profile } = useOrganizationContext()
  const roleFetcher = useFetcher()
  const isHydrated = useIsHydrated()
  const { t } = useI18n()
  const url = `/api/settings/org/${slug}/members`
  // Client-only: a server-rendered Dropdown in this (SSR-opened) dialog never
  // opens in the production build.
  if (!isHydrated) return <span className={MANAGE}>{t("Manage")}</span>
  return (
    <Dropdown>
      {/* The trigger is already a pressable button — a styled span inside, not
          a nested <button> (invalid HTML). */}
      <Dropdown.Trigger>
        <span className={MANAGE}>{t("Manage")}</span>
      </Dropdown.Trigger>
      <Dropdown.Popover placement="top">
        <Dropdown.Menu
          aria-label={t("Manage {name}", { name: member.displayName ?? member.userEmail })}
          onAction={(action) =>
            action === "remove" || action === "teams"
              ? openDialog(`${action}:${member.userEmail}`)
              : roleFetcher.submit(
                  { role: String(action), userEmail: member.userEmail },
                  { method: "POST", action: url }
                )
          }
        >
          {member.role === Role.USER ? (
            <Dropdown.Item id={Role.ADMIN} textValue={t("Admin")}>
              <div className="flex gap-2 items-center">
                <ChevronsUp size={28} className="p-1 bg-warning/10 text-warning rounded-small" />
                {t("Admin")}
              </div>
            </Dropdown.Item>
          ) : (
            <Dropdown.Item id={Role.USER} textValue={t("User")}>
              <div className="flex gap-2 items-center">
                <ChevronUp
                  size={28}
                  className="p-1 bg-slate-400/10 text-foreground-600 rounded-small"
                />
                {t("User")}
              </div>
            </Dropdown.Item>
          )}
          <Dropdown.Item id="teams" textValue={t("Teams…")}>
            <div className="flex gap-2 items-center">
              <UsersRound size={28} className="p-1 bg-accent/10 text-accent rounded-small" />
              {t("Teams…")}
            </div>
          </Dropdown.Item>
          {/* Not yourself: you leave from your own settings. */}
          {member.userEmail !== profile.userEmail ? (
            <Dropdown.Item id="remove" textValue={t("Remove")} variant="danger">
              <div className="flex gap-2 items-center text-danger">
                <UserMinus size={28} className="p-1 bg-danger/10 rounded-small" />
                {t("Remove from organization")}
              </div>
            </Dropdown.Item>
          ) : null}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  )
}
