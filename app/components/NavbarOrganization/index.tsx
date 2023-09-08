import { FireIcon } from '@heroicons/react/24/solid'
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenu,
  NavbarMenuItem,
  NavbarMenuToggle,
  Link as NextUiLink,
} from '@nextui-org/react'
import { Link, useLocation } from '@remix-run/react'
import type { Organization } from '~/core/organization/types'
import { useUser } from '~/utils/remix'
import { UserDropdown } from '../Navigation/UserDropdown'

interface Props {
  organization: Organization
}

export const HeaderOrganization = ({ organization }: Props) => {
  const user = useUser()
  const { pathname } = useLocation()

  return (
    <Navbar isBordered>
      <NavbarMenuToggle className="sm:hidden" />
      <NavbarBrand
        as={Link}
        to={'/'}
        className="flex gap-1 font-extrabold text-xl"
      >
        <h1>Hot Seat</h1>
        <FireIcon className="text-red-500 dark:text-red-300" width={32} />
        <span>+ {organization.name}</span>
      </NavbarBrand>
      <NavbarContent className="hidden sm:flex ">
        <NavbarItem>
          <NextUiLink
            isBlock
            color={pathname.includes('spaces') ? 'primary' : 'foreground'}
            as={Link}
            to="spaces"
          >
            Spaces
          </NextUiLink>
        </NavbarItem>
        <NavbarItem>
          <NextUiLink
            isBlock
            color={pathname.includes('settings') ? 'primary' : 'foreground'}
            as={Link}
            to="settings"
          >
            Settings
          </NextUiLink>
        </NavbarItem>
      </NavbarContent>
      <NavbarContent justify="end" className="hidden sm:flex">
        <UserDropdown user={user} />
      </NavbarContent>
      <NavbarMenu>
        <NavbarMenuItem>
          <UserDropdown user={user} />
        </NavbarMenuItem>

        <NavbarMenuItem>
          <NextUiLink
            color={
              pathname.includes('/app/organizations') ? 'primary' : 'foreground'
            }
            as={Link}
            to="/app/organizations"
          >
            Organizations
          </NextUiLink>
        </NavbarMenuItem>
      </NavbarMenu>
    </Navbar>
  )
}
