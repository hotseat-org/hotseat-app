import {
  Avatar,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownSection,
  DropdownTrigger,
  Switch,
  User,
} from "@nextui-org/react"
import { useNavigate } from "react-router";
import { LogOut, Moon, Settings, Sun } from "lucide-react"
import { Theme, useTheme } from "remix-themes"
import type { User as UserType } from "~/core/user/types"

interface Props {
  user: UserType
}

export const UserDropdown = ({ user }: Props) => {
  const [theme, setTheme] = useTheme()
  const navigate = useNavigate()

  return (
    <Dropdown>
      <DropdownTrigger>
        <Avatar as="button" isFocusable isBordered src={user.photo} name={user.displayName} />
      </DropdownTrigger>
      <DropdownMenu
        disabledKeys={["profile"]}
        onAction={(key) => navigate(key.toString(), { replace: key === "/logout" })}
      >
        <DropdownSection aria-label="Profile & Actions" showDivider>
          <DropdownItem
            textValue={user.displayName}
            isReadOnly
            key="profile"
            className="opacity-100 h-14 gap-2"
          >
            <User
              name={user.displayName}
              description={user.email}
              avatarProps={{
                size: "sm",
                src: user.photo,
              }}
            />
          </DropdownItem>
          <DropdownItem
            textValue={theme ?? "Theme"}
            isReadOnly
            key="theme"
            className="opacity-100 "
          >
            <Switch
              defaultSelected={theme === Theme.DARK}
              color="primary"
              startContent={<Moon />}
              endContent={<Sun />}
              onValueChange={(isSelected) => setTheme(isSelected ? Theme.DARK : Theme.LIGHT)}
            >
              Dark mode
            </Switch>
          </DropdownItem>
        </DropdownSection>
        <DropdownItem
          textValue="Setting"
          variant="flat"
          startContent={
            <div className="bg-foreground/10 text-foreground flex items-center rounded-small justify-center w-7 h-7">
              <Settings size={18} />
            </div>
          }
          key="/app/settings"
        >
          Settings
        </DropdownItem>
        <DropdownItem
          textValue="Logout"
          key="/logout"
          className="font-bold text-danger"
          color="danger"
          variant="flat"
          startContent={
            <div className="bg-danger/10 text-danger flex items-center rounded-small justify-center w-7 h-7">
              <LogOut size={18} />
            </div>
          }
        >
          Logout
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  )
}
