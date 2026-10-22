import { Chip, Dropdown, Spinner, Table } from "@heroui/react"
import { ChevronUp, ChevronsUp, CornerUpLeft } from "lucide-react"
import { useFetcher, useParams } from "react-router"
import { useSettings } from "../useSettings"
import { useOrgSettingsData } from "../data"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"

export function OrgMembers() {
  const { slug } = useParams()
  const { selectSection } = useSettings()
  const url = `/api/settings/org/${slug}/members`

  // Loaded on the server with the page; refreshed after a role change.
  const members = useOrgSettingsData("members")?.members
  const roleFetcher = useFetcher()

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-sm text-muted">
            To add new members you need to{" "}
            <button
              type="button"
              onClick={() => selectSection("invitations")}
              className="inline font-bold text-accent hover:underline"
            >
              invite <CornerUpLeft strokeWidth={4} className="inline" size={14} />
            </button>{" "}
            them.
          </p>
        </div>

        {members === undefined ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : members === null ? (
          <p className="text-sm text-muted">Only admins can see and manage members.</p>
        ) : (
          <Table>
            <Table.ScrollContainer>
              {/* Wide enough to read: on a phone the table scrolls sideways. */}
              <Table.Content aria-label="Members table" className="min-w-[560px]">
                <Table.Header>
                  <Table.Column isRowHeader>EMAIL</Table.Column>
                  <Table.Column>NAME</Table.Column>
                  <Table.Column>ROLE</Table.Column>
                  <Table.Column>ACTIONS</Table.Column>
                </Table.Header>
                <Table.Body>
                  {members.data.map((member) => (
                    <Table.Row key={member.userEmail}>
                      <Table.Cell>{member.userEmail}</Table.Cell>
                      <Table.Cell>{member.displayName}</Table.Cell>
                      <Table.Cell>
                        <Chip color={member.role === Role.ADMIN ? "warning" : "default"}>
                          <div className="flex gap-1 items-center">
                            {member.role === Role.ADMIN ? (
                              <ChevronsUp size={16} />
                            ) : (
                              <ChevronUp size={16} />
                            )}
                            {member.role.toLowerCase()}
                          </div>
                        </Chip>
                      </Table.Cell>
                      <Table.Cell>
                        <Dropdown>
                          {/* The trigger is already a pressable button — a styled span
                              inside, not a nested <button> (invalid HTML). */}
                          <Dropdown.Trigger>
                            <span className="inline-flex h-8 cursor-pointer items-center rounded-lg px-3 text-sm font-medium text-foreground transition-colors hover:bg-foreground/10">
                              Set role
                            </span>
                          </Dropdown.Trigger>
                          <Dropdown.Popover placement="top">
                            <Dropdown.Menu
                              aria-label="List of assignable roles"
                              onAction={(role) =>
                                roleFetcher.submit(
                                  { role: String(role), userEmail: member.userEmail },
                                  { method: "POST", action: url }
                                )
                              }
                            >
                              {member.role === Role.USER ? (
                                <Dropdown.Item id={Role.ADMIN} textValue="Admin">
                                  <div className="flex gap-2 items-center">
                                    <ChevronsUp
                                      size={28}
                                      className="p-1 bg-warning/10 text-warning rounded-small"
                                    />
                                    Admin
                                  </div>
                                </Dropdown.Item>
                              ) : (
                                <Dropdown.Item id={Role.USER} textValue="User">
                                  <div className="flex gap-2 items-center">
                                    <ChevronUp
                                      size={28}
                                      className="p-1 bg-slate-400/10 text-foreground-600 rounded-small"
                                    />
                                    User
                                  </div>
                                </Dropdown.Item>
                              )}
                            </Dropdown.Menu>
                          </Dropdown.Popover>
                        </Dropdown>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        )}
      </div>
    </div>
  )
}
