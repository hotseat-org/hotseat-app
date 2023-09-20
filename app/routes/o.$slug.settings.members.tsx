import {
  Button,
  Chip,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from '@nextui-org/react'
import { Role } from '@prisma/client'
import { Link, Outlet, useFetcher, useLoaderData } from '@remix-run/react'
import type { ActionFunctionArgs, LoaderFunctionArgs } from '@vercel/remix'
import { json, redirect } from '@vercel/remix'
import { ChevronUp, ChevronsUp, CornerUpLeft } from 'lucide-react'
import { z } from 'zod'
import { getCore } from '~/core/get-core'
import { requireUser } from '~/services/session.server'

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const slug = params.slug
  if (!slug) throw new Error('Missing slug parameter')

  const user = await requireUser(request)

  const formData = await request.formData()
  const { role, userEmail } = z
    .object({ role: z.nativeEnum(Role), userEmail: z.string() })
    .parse(Object.fromEntries([...formData.entries()]))

  const core = getCore()
  await core.organization.setMemberRole({
    slug,
    userEmail: user.email,
    otherUserEmail: userEmail,
    role,
  })

  return null
}

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const slug = params.slug
  if (!slug) return redirect('/')

  const user = await requireUser(request)
  const core = getCore()

  return json(
    await core.organization.getMembers({ userEmail: user.email, slug })
  )
}

const Invitations = () => {
  const members = useLoaderData<typeof loader>()
  const { submit } = useFetcher()

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-bold">Members</h2>
          <p className="text-foreground/60">
            To add new members you need to{' '}
            <Link to="../invitations" className="text-primary inline">
              <span className="font-bold">
                invite{' '}
                <CornerUpLeft strokeWidth={4} className="inline" size={14} />
              </span>
            </Link>{' '}
            them.
          </p>
        </div>

        <Table aria-label="Example static collection table">
          <TableHeader>
            <TableColumn>EMAIL</TableColumn>
            <TableColumn>NAME</TableColumn>
            <TableColumn>ROLE</TableColumn>
            <TableColumn>ACTIONS</TableColumn>
          </TableHeader>
          <TableBody>
            {members.data.map((member) => {
              const availableRoles =
                member.role === Role.USER
                  ? [
                      {
                        key: Role.ADMIN,
                        icon: (
                          <ChevronsUp
                            size={28}
                            className="p-1 bg-warning/10 text-warning rounded-small"
                          />
                        ),
                        label: 'Admin',
                      },
                    ]
                  : [
                      {
                        key: Role.USER,
                        icon: (
                          <ChevronUp
                            size={28}
                            className="p-1 bg-slate-400/10 text-foreground-600 rounded-small"
                          />
                        ),
                        label: 'User',
                      },
                    ]

              return (
                <TableRow key={member.userEmail}>
                  <TableCell>{member.userEmail}</TableCell>
                  <TableCell>{member.displayName}</TableCell>
                  <TableCell>
                    <Chip
                      color={member.role === Role.ADMIN ? 'warning' : 'default'}
                    >
                      <div className="flex gap-1 items-center">
                        {member.role === Role.ADMIN ? (
                          <ChevronsUp size={16} />
                        ) : (
                          <ChevronUp size={16} />
                        )}
                        {member.role.toLowerCase()}
                      </div>
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <Dropdown placement="top">
                      <DropdownTrigger>
                        <Button size="sm" variant="flat">
                          Set role
                        </Button>
                      </DropdownTrigger>
                      <DropdownMenu
                        aria-label="List of assignable roles"
                        items={availableRoles}
                        onAction={(role) =>
                          submit(
                            { role, userEmail: member.userEmail },
                            { method: 'POST' }
                          )
                        }
                      >
                        {(item: any) => (
                          <DropdownItem
                            key={item.role}
                            startContent={item.icon}
                          >
                            {item.label}
                          </DropdownItem>
                        )}
                      </DropdownMenu>
                    </Dropdown>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <Outlet />
    </div>
  )
}

export default Invitations
