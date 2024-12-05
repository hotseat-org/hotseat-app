import {
  Button,
  Chip,
  Code,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Tooltip,
} from "@nextui-org/react"
import { Form, Link, Outlet, useLoaderData, useParams, redirect } from "react-router"
import type { LoaderFunctionArgs } from "react-router"
import dayjs from "dayjs"
import { Copy, ExternalLink, Mail, RefreshCcw, Trash } from "lucide-react"
import pluralize from "pluralize"
import { useRef } from "react"
import { z } from "zod"
import { getCore } from "~/core/get-core"
import { InviteStatus } from "~/core/organization-invite/types"
import { requireUser } from "~/services/session.server"
import { useOrganizationContext } from "~/utils/hooks/useProfileData"

enum Intent {
  DELETE_INVITE = "delete-invite",
}

export const action = async ({ request, params }: LoaderFunctionArgs) => {
  const slug = params.slug
  if (!slug) return redirect("/")

  const formData = await request.formData()
  const intent = z.nativeEnum(Intent).parse(formData.get("intent"))
  const user = await requireUser(request)
  const core = getCore()

  if (intent === Intent.DELETE_INVITE) {
    const email = z.string().email().parse(formData.get("email"))
    await core.organization.deleteInvite({ slug, userEmail: user.email, email })
  }

  return null
}

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const slug = params.slug
  if (!slug) throw redirect("/")

  const user = await requireUser(request)
  const core = getCore()

  return await core.organization.getInvites({ userEmail: user.email, slug })
}

const Invitations = () => {
  const { organization } = useOrganizationContext()
  const invites = useLoaderData<typeof loader>()
  const { slug } = useParams()
  const inviteUrlRef = useRef<HTMLDivElement | null>(null)
  const universalInviteUrlRef = useRef<HTMLDivElement | null>(null)

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Direct invitations</h2>
          <div className="flex items-center gap-2">
            <Tooltip content="Invited members can join at this url">
              <Code ref={inviteUrlRef} size="sm" className="flex items-center gap-2">
                http://localhost:3000/join/{slug}
                <Button
                  isIconOnly
                  size="sm"
                  onClick={() => {
                    if (inviteUrlRef.current) {
                      const element = inviteUrlRef.current
                      navigator.clipboard.writeText(element.innerText)
                    }
                  }}
                >
                  <Copy size={14} />
                </Button>
              </Code>
            </Tooltip>
            <Button variant="flat" color="primary" as={Link} to="invite" replace>
              <Mail /> Invite new member
            </Button>
          </div>
        </div>
        <Table aria-label="Example static collection table">
          <TableHeader>
            <TableColumn>EMAIL</TableColumn>
            <TableColumn>SENT AT</TableColumn>
            <TableColumn>EXPIRES AT</TableColumn>
            <TableColumn width={100}>STATUS</TableColumn>
            <TableColumn width={100} align="center">
              ACTIONS
            </TableColumn>
          </TableHeader>
          <TableBody emptyContent="No unresolved invitations">
            {invites.map((invite) => (
              <TableRow key={invite.email}>
                <TableCell>{invite.email}</TableCell>
                <TableCell>{dayjs(invite.createdAt).format("D.M.YYYY")}</TableCell>
                <TableCell>
                  {pluralize("day", dayjs(invite.expiresAt).diff(dayjs(), "days"), true)}
                </TableCell>
                <TableCell>
                  <Chip color={invite.status === InviteStatus.PENDING ? "primary" : "danger"}>
                    {invite.status}
                  </Chip>
                </TableCell>
                <TableCell>
                  <Form method="POST" className="flex justify-center">
                    <input hidden name="email" defaultValue={invite.email} />
                    <Tooltip content="Delete">
                      <Button
                        color="danger"
                        variant="light"
                        isIconOnly
                        size="sm"
                        type="submit"
                        name="intent"
                        value={Intent.DELETE_INVITE}
                      >
                        <Trash size={18} />
                      </Button>
                    </Tooltip>
                  </Form>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {organization.invitationHash && (
        <>
          <Divider />
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-xl font-bold">Universal invitation</h2>
              <Tooltip
                content={
                  <div className="flex flex-col justify-start">
                    <p>Anyone with this link can join your organization.</p>
                    <p>You can generate a new one to disable the current one.</p>
                  </div>
                }
              >
                <div className="flex gap-2 text-danger/80 items-center">
                  <p>Don't share this link publicly.</p>

                  <ExternalLink size={16} />
                </div>
              </Tooltip>
            </div>
            <div className="flex gap-1">
              <Code ref={universalInviteUrlRef} size="sm" className="flex items-center gap-2">
                http://localhost:3000/join/{slug}/{organization.invitationHash}
                <Button
                  isIconOnly
                  size="sm"
                  onClick={() => {
                    if (universalInviteUrlRef.current) {
                      const element = universalInviteUrlRef.current
                      // Copy the text inside the text field
                      navigator.clipboard.writeText(element.innerText)
                    }
                  }}
                >
                  <Copy size={14} />
                </Button>
              </Code>
              <Button as={Link} to="generate" color="primary" variant="flat" isIconOnly>
                <RefreshCcw />
              </Button>
            </div>
          </div>
        </>
      )}
      <Outlet />
    </div>
  )
}

export default Invitations
