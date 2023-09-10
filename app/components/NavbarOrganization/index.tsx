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
import { Flame } from 'lucide-react'
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
      <NavbarBrand as={Link} to={'/'} className="flex gap-4">
        <Flame className="text-red-500 dark:text-red-300" width={32} />
        <div className="flex flex-col">
          <h1 className="font-extrabold text-xl">Hot Seat</h1>
          <h2 className="text-bold text-foreground/70">@{organization.name}</h2>
        </div>
      </NavbarBrand>
      <NavbarContent className="hidden sm:flex">
        <NavbarItem isActive={pathname.includes('offices')}>
          <NextUiLink
            color={pathname.includes('offices') ? 'primary' : 'foreground'}
            as={Link}
            to="offices"
          >
            Offices
          </NextUiLink>
        </NavbarItem>
        <NavbarItem isActive={pathname.includes('settings')}>
          <NextUiLink
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
