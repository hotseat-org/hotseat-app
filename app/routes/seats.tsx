import { Button, Navbar, Typography } from '@material-tailwind/react'
import { Form, Outlet } from '@remix-run/react'
import { LinksFunction } from '@remix-run/react/dist/routeModules.js'

import headerStyle from '../styles/header.css'

export let links: LinksFunction = () => {
  return [{ rel: 'stylesheet', href: headerStyle }]
}

const Index = () => {
  return (
    <>
      <Navbar className="mx-auto max-w-screen-xl p-2 lg:rounded-full lg:pl-6 my-5">
        <div className="relative mx-auto flex text-blue-gray-900 justify-between">
          <Typography
            as="a"
            href="#"
            variant="small"
            className="mr-4 cursor-pointer py-1.5 font-normal"
          >
            <span>Qseat</span>
          </Typography>

          <Form method="post" action={`/logout`}>
            <Button
              variant="gradient"
              size="sm"
              className="hidden lg:inline-block mr-10"
              type="submit"
            >
              <span>Logout</span>
            </Button>
          </Form>
        </div>
      </Navbar>

      <div className="flex">
        <Outlet />
      </div>
    </>
  )
}

export default Index
