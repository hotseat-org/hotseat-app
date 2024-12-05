import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenu,
  NavbarMenuItem,
  NavbarMenuToggle,
  Link as NextUiLink,
} from "@nextui-org/react"
import { Role } from "@prisma/client"
import { Link, useLocation } from "react-router"
import { Flame } from "lucide-react"
import { UserDropdown } from "../Navigation/UserDropdown"
import type { Organization } from "~/core/organization/types"
import type { Profile } from "~/core/profile/types"
import { useUser } from "~/utils/remix"

interface Props {
  organization: Organization
  profile: Profile
}

export const HeaderOrganization = ({ organization, profile }: Props) => {
  const user = useUser()
  const { pathname } = useLocation()

  return (
    <Navbar isBordered>
      <NavbarMenuToggle className="sm:hidden" />
      <NavbarBrand as={Link} to={"/"} className="flex gap-4">
        <Flame className="text-red-500 dark:text-red-300" width={32} />
        <div className="flex flex-col">
          <h1 className="font-extrabold text-xl">Hot Seat</h1>
          <h2 className="text-bold text-foreground/70">@{organization.name}</h2>
        </div>
      </NavbarBrand>
      <NavbarContent className="hidden sm:flex">
        <NavbarItem isActive={pathname.includes("offices")}>
          <NextUiLink
            color={pathname.includes("offices") ? "primary" : "foreground"}
            as={Link}
            to="offices"
          >
            Offices
          </NextUiLink>
        </NavbarItem>
        {profile.role === Role.ADMIN && (
          <NavbarItem isActive={pathname.includes("settings")}>
            <NextUiLink
              color={pathname.includes("settings") ? "primary" : "foreground"}
              as={Link}
              to="settings"
            >
              Settings
            </NextUiLink>
          </NavbarItem>
        )}
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
            color={pathname.includes("/app/invitations") ? "primary" : "foreground"}
            as={Link}
            to="/app/invitations"
          >
            Organizations
          </NextUiLink>
        </NavbarMenuItem>
      </NavbarMenu>
    </Navbar>
  )
}
