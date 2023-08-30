import { FireIcon, MoonIcon, SunIcon } from '@heroicons/react/24/solid'
import {
  Button,
  NavbarBrand,
  NavbarContent,
  Navbar,
  NavbarItem,
  Avatar,
  Link as NextUiLink,
} from '@nextui-org/react'
import { Link, useLocation } from '@remix-run/react'
import { Theme, useTheme } from 'remix-themes'
import { useUser } from '~/utils/remix'

export const Header = () => {
  const user = useUser()
  const { pathname } = useLocation()
  const [theme, setTheme] = useTheme()

  console.log({ theme })

  return (
    <Navbar isBordered>
      <NavbarBrand className="flex gap-1">
        <h1 className="font-extrabold text-xl">Hot Seat</h1>
        <FireIcon className="text-red-500 dark:text-red-300" width={32} />
      </NavbarBrand>
      <NavbarContent>
        <NavbarItem>
          <NextUiLink
            isBlock
            color={pathname === '/app/organizations' ? 'primary' : 'foreground'}
            as={Link}
            to="/app/organizations"
          >
            Organizations
          </NextUiLink>
        </NavbarItem>
        <NavbarItem>
          <NextUiLink
            isBlock
            color={pathname === '/app/reservations' ? 'primary' : 'foreground'}
            as={Link}
            to="/app/reservations"
          >
            Reservations
          </NextUiLink>
        </NavbarItem>
      </NavbarContent>
      <NavbarContent justify="end">
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
          <Button variant="flat" color="primary" href="/logout" as="a">
            Logout
          </Button>
        </NavbarItem>
      </NavbarContent>
    </Navbar>
  )
}
