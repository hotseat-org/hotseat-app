import { FireIcon, MoonIcon, SunIcon } from '@heroicons/react/24/solid'
import {
  Avatar,
  Button,
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
import { Theme, useTheme } from 'remix-themes'
import type { Organization } from '~/core/organization/types'
import { useUser } from '~/utils/remix'

interface Props {
  organization: Organization
}

export const HeaderOrganization = ({ organization }: Props) => {
  const user = useUser()
  const { pathname } = useLocation()
  const [theme, setTheme] = useTheme()

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
        <p>{user.displayName}</p>
        <Avatar src={user.photo} name={user.displayName} />
        <NavbarItem className="flex items-center gap-1">
          <Button
            isIconOnly
            variant="flat"
            onClick={() =>
              setTheme(theme === Theme.DARK ? Theme.LIGHT : Theme.DARK)
            }
          >
            {theme === Theme.LIGHT ? (
              <MoonIcon height={24} />
            ) : (
              <SunIcon height={24} />
            )}
          </Button>
          <Button variant="flat" color="danger" href="/logout" as="a">
            Logout
          </Button>
        </NavbarItem>
      </NavbarContent>
      <NavbarMenu>
        <NavbarMenuItem className="flex gap-4 items-center mb-4">
          <Avatar src={user.photo} name={user.displayName} />
          <p>{user.displayName}</p>
          <NavbarItem className="flex items-center gap-1">
            <Button
              isIconOnly
              variant="flat"
              onClick={() =>
                setTheme(theme === Theme.DARK ? Theme.LIGHT : Theme.DARK)
              }
            >
              {theme === Theme.LIGHT ? (
                <MoonIcon height={24} />
              ) : (
                <SunIcon height={24} />
              )}
            </Button>
          </NavbarItem>
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
        <NavbarMenuItem>
          <NextUiLink color="danger" as={Link} to="/logout">
            Log Out
          </NextUiLink>
        </NavbarMenuItem>
      </NavbarMenu>
    </Navbar>
  )
}
