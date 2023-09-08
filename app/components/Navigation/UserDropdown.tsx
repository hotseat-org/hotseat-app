import {
  Avatar,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownSection,
  DropdownTrigger,
  Switch,
  User,
} from '@nextui-org/react'
import { Link } from '@remix-run/react'
import { LogOut, Moon, Sun } from 'lucide-react'
import { Theme, useTheme } from 'remix-themes'
import type { User as UserType } from '~/core/user/types'

interface Props {
  user: UserType
}

export const UserDropdown = ({ user }: Props) => {
  const [theme, setTheme] = useTheme()
  return (
    <Dropdown>
      <DropdownTrigger>
        <Avatar
          as="button"
          isFocusable
          isBordered
          src={user.photo}
          name={user.displayName}
        />
      </DropdownTrigger>
      <DropdownMenu disabledKeys={['profile']}>
        <DropdownSection aria-label="Profile & Actions" showDivider>
          <DropdownItem
            isReadOnly
            key="profile"
            className="opacity-100 h-14 gap-2"
          >
            <User
              name={user.displayName}
              description={user.email}
              avatarProps={{
                size: 'sm',
                src: user.photo,
              }}
            />
          </DropdownItem>
          <DropdownItem isReadOnly key="theme" className="opacity-100 ">
            <Switch
              defaultSelected={theme === Theme.DARK}
              color="primary"
              startContent={<Moon />}
              endContent={<Sun />}
              onValueChange={(isSelected) =>
                setTheme(isSelected ? Theme.DARK : Theme.LIGHT)
              }
            >
              Dark mode
            </Switch>
          </DropdownItem>
        </DropdownSection>
        <DropdownItem
          className="font-bold text-danger"
          color="danger"
          variant="flat"
          startContent={
            <div className="bg-danger/10 text-danger flex items-center rounded-small justify-center w-7 h-7">
              <LogOut size={18} />
            </div>
          }
        >
          <Link replace to="/logout">
            Logout
          </Link>
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  )
}
