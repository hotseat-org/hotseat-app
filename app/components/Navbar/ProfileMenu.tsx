import { ChevronDownIcon, PowerIcon } from '@heroicons/react/24/outline'
import {
  Menu,
  MenuHandler,
  Button,
  Avatar,
  MenuList,
  MenuItem,
  Typography,
} from '@material-tailwind/react'
import { Form } from '@remix-run/react'
import { useState } from 'react'
import type { User } from '~/core/types'

interface Props {
  user: User
}

export const ProfileMenu = ({ user }: Props) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const closeMenu = () => setIsMenuOpen(false)

  return (
    <Menu open={isMenuOpen} handler={setIsMenuOpen} placement="bottom-end">
      <MenuHandler>
        <Button
          variant="text"
          color="blue-gray"
          className="flex items-center gap-1 rounded-full py-0.5 pr-2 pl-0.5 lg:ml-auto"
        >
          <div className="flex gap-5 items-center pl-2">
            <span>{user.displayName}</span>
            <div className="flex items-center gap-1">
              <Avatar
                variant="circular"
                size="sm"
                alt="candice wu"
                className="border border-blue-500 p-0.5"
                src={user.photo}
              />
              <ChevronDownIcon
                strokeWidth={2.5}
                className={`h-3 w-3 transition-transform ${
                  isMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </div>
          </div>
        </Button>
      </MenuHandler>

      <MenuList className="p-1">
        <Form method="post" action={`/logout`} className="outline-none">
          <MenuItem
            onClick={closeMenu}
            type="submit"
            className={`flex items-center gap-2 rounded`}
          >
            <PowerIcon strokeWidth={2} className="h-4 w-4 text-red-500" />
            <Typography
              as="span"
              variant="small"
              className="font-normal"
              color="red"
            >
              Logout
            </Typography>
          </MenuItem>
        </Form>
      </MenuList>
    </Menu>
  )
}
