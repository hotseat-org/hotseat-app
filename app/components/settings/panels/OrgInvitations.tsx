import { Chip, Spinner, Table } from "@heroui/react"
import dayjs from "dayjs"
import { Copy, ExternalLink, Link as LinkIcon, Mail, RefreshCcw, Trash } from "lucide-react"
import pluralize from "pluralize"
import { useFetcher, useParams } from "react-router"
import { GenerateLinkDialog } from "../dialogs/GenerateLink"
import { InviteMemberDialog } from "../dialogs/InviteMember"
import { CardTitle, SettingsCard } from "../ui"
import { useSettings } from "../useSettings"
import { useOrgSettingsData } from "../data"
import { Button } from "~/components/Button"
import { useOrganizationContext } from "~/utils/hooks/useProfileData"

const copyToClipboard = (text: string) => navigator.clipboard.writeText(text)

export function OrgInvitations() {
  const { slug } = useParams()
  const { organization } = useOrganizationContext()
  const { dialog, openDialog } = useSettings()
  const url = `/api/settings/org/${slug}/invitations`

  const deleteFetcher = useFetcher()

  // Loaded on the server with the page; refreshed after every change.
  const settings = useOrgSettingsData("invitations")
  const data = settings?.invites
    ? { invites: settings.invites, origin: settings.origin }
    : undefined

  if (settings && settings.invites === null)
    return <p className="text-sm text-muted">Only admins can invite people.</p>

  if (data === undefined)
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    )

  const { invites, origin } = data
  const joinUrl = `${origin}${import.meta.env.BASE_URL}join/${slug}`
  const universalJoinUrl = organization.invitationHash
    ? `${origin}${import.meta.env.BASE_URL}join/${slug}/${organization.invitationHash}`
    : null

  return (
    <>
      <SettingsCard className="flex flex-col gap-4">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between sm:gap-4">
          <div>
            <CardTitle>Direct invitations</CardTitle>
            <p className="mt-1 text-sm text-muted">
              Add someone's email and they'll see the invitation when they sign in with it. No email
              is sent — share the invite link below with them.
            </p>
          </div>
          <Button variant="primary" size="sm" onPress={() => openDialog("invite")}>
            <Mail size={16} /> Invite member
          </Button>
        </div>

        {invites.length > 0 ? (
          <Table>
            <Table.ScrollContainer>
              {/* Wide enough to read: on a phone the table scrolls sideways. */}
              <Table.Content aria-label="Invitations table" className="min-w-[560px]">
                <Table.Header>
                  <Table.Column isRowHeader>EMAIL</Table.Column>
                  <Table.Column>SENT</Table.Column>
                  <Table.Column>EXPIRES</Table.Column>
                  <Table.Column>STATUS</Table.Column>
                  <Table.Column width={80} className="text-center">
                    ACTIONS
                  </Table.Column>
                </Table.Header>
                <Table.Body>
                  {invites.map((invite) => (
                    <Table.Row key={invite.email}>
                      <Table.Cell>{invite.email}</Table.Cell>
                      <Table.Cell>{dayjs(invite.createdAt).format("D.M.YYYY")}</Table.Cell>
                      <Table.Cell>
                        {pluralize(
                          "day",
                          Math.ceil(dayjs(invite.expiresAt).diff(dayjs(), "days", true)),
                          true
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        <Chip size="sm">{invite.status}</Chip>
                      </Table.Cell>
                      <Table.Cell>
                        <deleteFetcher.Form
                          method="POST"
                          action={url}
                          className="flex justify-center"
                        >
                          <input type="hidden" name="intent" value="delete-invite" />
                          <input hidden name="email" defaultValue={invite.email} />
                          <Button variant="danger" isIconOnly size="sm" type="submit">
                            <Trash size={16} />
                          </Button>
                        </deleteFetcher.Form>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
            No pending invitations
          </div>
        )}
      </SettingsCard>

      <SettingsCard className="flex flex-col gap-4">
        <div>
          <CardTitle>Invite link</CardTitle>
          <p className="mt-1 text-sm text-muted">
            For people you've invited above: it takes them straight in. Anyone else needs an
            invitation first.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-secondary px-4 py-2.5">
          <LinkIcon size={16} className="shrink-0 text-muted" />
          <span className="text-sm font-mono truncate">{joinUrl}</span>
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            onPress={() => copyToClipboard(joinUrl)}
            className="ml-auto shrink-0"
          >
            <Copy size={14} />
          </Button>
        </div>
      </SettingsCard>

      {organization.invitationHash && universalJoinUrl && (
        <SettingsCard className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Universal invite link</CardTitle>
              <p className="mt-1 text-sm text-muted">
                Anyone with this link can join without a direct invitation.
              </p>
            </div>
            <Button
              variant="ghost"
              isIconOnly
              size="sm"
              aria-label="Regenerate link"
              onPress={() => openDialog("generate")}
            >
              <RefreshCcw size={16} />
            </Button>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 px-4 py-2.5">
            <ExternalLink size={16} className="shrink-0 text-warning" />
            <span className="text-sm font-mono truncate">{universalJoinUrl}</span>
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              onPress={() => copyToClipboard(universalJoinUrl)}
              className="ml-auto shrink-0"
            >
              <Copy size={14} />
            </Button>
          </div>
          <p className="text-xs text-muted">
            Be careful sharing this link — regenerate it to revoke access for anyone who has it.
          </p>
        </SettingsCard>
      )}

      {dialog === "invite" && <InviteMemberDialog />}
      {dialog === "generate" && <GenerateLinkDialog />}
    </>
  )
}
