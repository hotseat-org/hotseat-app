import {
  Chip,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from '@nextui-org/react'
import { Role } from '@prisma/client'
import type { LoaderArgs } from '@remix-run/node'
import { json, redirect } from '@remix-run/node'
import { Outlet, useLoaderData } from '@remix-run/react'
import { getCore } from '~/core/get-core'
import { requireUser } from '~/services/session.server'

export const loader = async ({ request, params }: LoaderArgs) => {
  const slug = params.slug
  if (!slug) return redirect('/')

  const user = await requireUser(request)
  const core = getCore()

  return json(await core.organization.getMembers({ userId: user.id, slug }))
}

const Invitations = () => {
  const members = useLoaderData<typeof loader>()

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-bold">Members</h2>
        <Table aria-label="Example static collection table">
          <TableHeader>
            <TableColumn>EMAIL</TableColumn>
            <TableColumn>NAME</TableColumn>
            <TableColumn>ROLE</TableColumn>
          </TableHeader>
          <TableBody emptyContent="No unresolved invitations">
            {members.map((member) => (
              <TableRow key={member.email}>
                <TableCell>{member.email}</TableCell>
                <TableCell>{member.displayName}</TableCell>
                <TableCell>
                  <Chip
                    color={member.role === Role.ADMIN ? 'primary' : 'default'}
                  >
                    {member.role.toLowerCase()}
                  </Chip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Outlet />
    </div>
  )
}

export default Invitations
