import {
  Avatar,
  Button,
  Input,
  Menu,
  MenuHandler,
  MenuItem,
  MenuList,
  Navbar,
  Typography,
} from '@material-tailwind/react'
import { Form, Outlet } from '@remix-run/react'
import React from 'react'
import { useState } from 'react'
import {
  ChartBarIcon,
  ChevronDownIcon,
  ClockIcon,
  FaceSmileIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  PaintBrushIcon,
  PowerIcon,
} from '@heroicons/react/24/outline'

// nav list component
const navListItems = [
  {
    label: 'Editor',
    icon: PaintBrushIcon,
  },
  {
    label: 'Spaces',
    icon: HomeIcon,
  },
  {
    label: 'Statistics',
    icon: ChartBarIcon,
  },
]

function NavList() {
  return (
    <ul className="mb-4 mt-2 flex flex-col gap-2 lg:mb-0 lg:mt-0 lg:flex-row lg:items-center">
      {navListItems.map(({ label, icon }) => (
        <Typography
          key={label}
          as="a"
          href="#"
          variant="small"
          color="blue-gray"
          className="font-normal"
        >
          <MenuItem className="flex items-center gap-2 lg:rounded-full">
            {React.createElement(icon, { className: 'h-[18px] w-[18px]' })}{' '}
            {label}
          </MenuItem>
        </Typography>
      ))}
    </ul>
  )
}

// profile menu component
const profileMenuItems = [
  {
    label: 'My Reservations',
    icon: ClockIcon,
  },
  {
    label: 'My Seats',
    icon: FaceSmileIcon,
  },
]

function ProfileMenu() {
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
          <Avatar
            variant="circular"
            size="sm"
            alt="candice wu"
            className="border border-blue-500 p-0.5"
            src="https://images.unsplash.com/photo-1633332755192-727a05c4013d?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1480&q=80"
          />
          <ChevronDownIcon
            strokeWidth={2.5}
            className={`h-3 w-3 transition-transform ${
              isMenuOpen ? 'rotate-180' : ''
            }`}
          />
        </Button>
      </MenuHandler>

      <MenuList className="p-1">
        {profileMenuItems.map(({ label, icon }) => {
          return (
            <MenuItem
              key={label}
              onClick={closeMenu}
              className={`flex items-center gap-2 rounded`}
            >
              {React.createElement(icon, {
                className: `h-4 w-4`,
                strokeWidth: 2,
              })}
              <Typography
                as="span"
                variant="small"
                className="font-normal"
                color="inherit"
              >
                {label}
              </Typography>
            </MenuItem>
          )
        })}
        <Form method="post" action={`/logout`}>
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

const Index = () => {
  return (
    <>
      <Navbar className="sticky mx-auto max-w-screen-xl p-2 lg:rounded-full lg:pl-6 my-5">
        <div className="relative mx-auto flex text-blue-gray-900 justify-between">
          <div className="flex gap-10">
            <Typography
              as="a"
              href="#"
              className="mr-4 ml-2 cursor-pointer py-1.5 font-bold"
            >
              Qseat
            </Typography>
            <NavList />
          </div>
          <div className="flex gap-10">
            <div className="w-72">
              <Input label="Search" icon={<MagnifyingGlassIcon />} />
            </div>
            <ProfileMenu />
          </div>
        </div>
      </Navbar>
      <Outlet />
    </>
  )
}

export default Index
