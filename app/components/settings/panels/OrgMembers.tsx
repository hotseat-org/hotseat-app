import { Chip, Dropdown, Spinner, Table } from "@heroui/react"
import { ChevronUp, ChevronsUp, CornerUpLeft, FileUp, UserMinus } from "lucide-react"
import { useFetcher, useParams } from "react-router"
import { useSettings } from "../useSettings"
import { useOrgSettingsData } from "../data"
import { ImportMembersDialog } from "../dialogs/ImportMembers"
import { RemoveMemberDialog } from "../dialogs/RemoveMember"
import { useIsHydrated } from "~/utils/hooks/useIsHydrated"
import { useOrganizationContext } from "~/utils/hooks/useProfileData"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"
import { roleLabel } from "~/components/office/shell-ui"
import { Button } from "~/components/Button"
import { Rich, useI18n } from "~/i18n/I18nProvider"

const MANAGE =
  "inline-flex h-8 cursor-pointer items-center rounded-lg px-3 text-sm font-medium text-foreground transition-colors hover:bg-foreground/10"

export function OrgMembers() {
  const { selectSection, dialog, openDialog } = useSettings()
  const { t } = useI18n()

  // Loaded on the server with the page; refreshed after a role change.
  const members = useOrgSettingsData("members")?.members
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
            {/* Phones: one card per person — a four-column table doesn't fit. */}
            <ul
              aria-label={t("Members")}
              className="flex flex-col divide-y divide-separator rounded-2xl border border-border bg-surface sm:hidden"
            >
              {members.data.map((member) => (
                <li key={member.userEmail} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {member.displayName ?? member.userEmail}
                    </p>
                    <p className="truncate text-xs text-muted">{member.userEmail}</p>
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
                    <Table.Column>{t("ROLE")}</Table.Column>
                    <Table.Column>{t("ACTIONS")}</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {members.data.map((member) => (
                      <Table.Row key={member.userEmail}>
                        <Table.Cell>{member.userEmail}</Table.Cell>
                        <Table.Cell>{member.displayName}</Table.Cell>
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
          </>
        )}
      </div>
      {removing && (
        <RemoveMemberDialog
          email={removing.userEmail}
          name={removing.displayName ?? removing.userEmail}
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
            action === "remove"
              ? openDialog(`remove:${member.userEmail}`)
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
