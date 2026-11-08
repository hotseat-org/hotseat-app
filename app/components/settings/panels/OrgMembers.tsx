import { Chip, Dropdown, Spinner, Table } from "@heroui/react"
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

const MANAGE =
  "inline-flex h-8 cursor-pointer items-center rounded-lg px-3 text-sm font-medium text-foreground transition-colors hover:bg-foreground/10"

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
          <p className="text-sm text-muted">
            <Rich
              text={t("To add new members, {invite} them.")}
              values={{
                invite: (
                  <button
                    type="button"
                    onClick={() => selectSection("invitations")}
                    className="inline font-bold text-accent hover:underline"
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
            <label className="flex h-11 items-center gap-2 rounded-xl border border-border bg-surface px-3 focus-within:ring-2 focus-within:ring-focus">
              <Search className="size-4 shrink-0 text-muted" />
              <input
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
                placeholder={t("Search by name or email")}
                aria-label={t("Search by name or email")}
                className="min-w-0 flex-1 bg-transparent text-[15px] outline-none"
              />
            </label>
            {/* Phones: one card per person — a four-column table doesn't fit. */}
            <ul
              aria-label={t("Members")}
              className="flex flex-col divide-y divide-separator border-y border-separator sm:hidden"
            >
              {pages.shown.map((member) => (
                <li key={member.userEmail} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {member.displayName ?? member.userEmail}
                    </p>
                    <p className="truncate text-xs text-muted">{member.userEmail}</p>
                    <MemberTeamChips teams={teamsByEmail.get(member.userEmail)} />
                  </div>
                  <RoleChip role={member.role} />
                  <ManageMenu member={member} />
                </li>
              ))}
            </ul>
            <Table className="hidden sm:block">
              <Table.ScrollContainer>
                <Table.Content aria-label={t("Members table")} className="min-w-[560px]">
                  <Table.Header>
                    <Table.Column isRowHeader>{t("EMAIL")}</Table.Column>
                    <Table.Column>{t("NAME")}</Table.Column>
                    <Table.Column>{t("TEAMS")}</Table.Column>
                    <Table.Column>{t("ROLE")}</Table.Column>
                    <Table.Column>{t("ACTIONS")}</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {pages.shown.map((member) => (
                      <Table.Row key={member.userEmail}>
                        <Table.Cell>{member.userEmail}</Table.Cell>
                        <Table.Cell>{member.displayName}</Table.Cell>
                        <Table.Cell>
                          <MemberTeamChips teams={teamsByEmail.get(member.userEmail)} />
                        </Table.Cell>
                        <Table.Cell>
                          <RoleChip role={member.role} />
                        </Table.Cell>
                        <Table.Cell>
                          <ManageMenu member={member} />
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
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

const RoleChip = ({ role }: { role: Role }) => {
  const i18n = useI18n()
  return (
    <Chip color={role === Role.ADMIN ? "warning" : "default"}>
      <div className="flex gap-1 items-center">
        {role === Role.ADMIN ? <ChevronsUp size={16} /> : <ChevronUp size={16} />}
        {roleLabel(i18n, role)}
      </div>
    </Chip>
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
