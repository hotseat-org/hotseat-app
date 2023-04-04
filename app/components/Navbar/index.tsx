import {
  ChartBarIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  PaintBrushIcon,
} from '@heroicons/react/24/outline'
import {
  Input,
  Navbar as MaterialNavbar,
  MenuItem,
  Typography,
} from '@material-tailwind/react'
import { ProfileMenu } from './ProfileMenu'
import { Link } from '@remix-run/react'

export const Navbar = () => (
  <MaterialNavbar className="fixed p-2 lg:rounded-full z-10 mt-5 left-1/2 transform -translate-x-1/2">
    <div className="mx-auto flex text-blue-gray-900 justify-between">
      <div className="flex gap-10">
        <Typography
          as="a"
          href="/"
          className="mr-4 ml-2 cursor-pointer py-1.5 font-bold"
        >
          Qseat
        </Typography>
        <ul className="mb-4 mt-2 flex flex-col gap-2 lg:mb-0 lg:mt-0 lg:flex-row lg:items-center">
          <Link to="/spaces">
            <Typography
              variant="small"
              color="blue-gray"
              className="font-normal"
            >
              <MenuItem className="flex items-center gap-2 lg:rounded-full">
                <HomeIcon className="h-[18px] w-[18px]" />
                Spaces
              </MenuItem>
            </Typography>
          </Link>
          <Typography
            as="a"
            href="#"
            variant="small"
            color="blue-gray"
            className="font-normal"
          >
            <MenuItem className="flex items-center gap-2 lg:rounded-full">
              <ChartBarIcon className="h-[18px] w-[18px]" />
              Statistics
            </MenuItem>
          </Typography>
        </ul>
      </div>
      <div className="flex gap-10">
        <div className="w-72">
          <Input label="Search" icon={<MagnifyingGlassIcon />} />
        </div>
        <ProfileMenu />
      </div>
    </div>
  </MaterialNavbar>
)
