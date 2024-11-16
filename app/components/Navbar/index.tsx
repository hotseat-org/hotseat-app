import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Navbar,
  NavbarBrand,
  NavbarContent,
} from "@nextui-org/react"
import { Link, useNavigate } from "@remix-run/react"
import { Flame, Plus, Users } from "lucide-react"
import { UserDropdown } from "../Navigation/UserDropdown"
import { useUser } from "~/utils/remix"

export const Header = () => {
  const user = useUser()
  const navigate = useNavigate()

  return (
    <Navbar isBordered>
      <NavbarBrand as={Link} to={"/"} className="flex gap-4">
        <Flame className="text-red-500 dark:text-red-300" width={32} />
        <h1 className="font-extrabold text-xl">Hot Seat</h1>
      </NavbarBrand>
      <div className="flex gap-4 items-center">
        <NavbarContent>
          <Dropdown backdrop="blur">
            <DropdownTrigger>
              <Button size="sm" isIconOnly color="primary" variant="flat">
                <Plus />
              </Button>
            </DropdownTrigger>
            <DropdownMenu onAction={(key) => navigate(key.toString())}>
              <DropdownItem
                textValue="New organization"
                key="/app/new-organization"
                startContent={
                  <Users size={28} className="p-1 bg-primary/10 text-primary rounded-small" />
                }
              >
                New organization
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </NavbarContent>

        <NavbarContent justify="end">
          <UserDropdown user={user} />
        </NavbarContent>
      </div>
    </Navbar>
  )
}
