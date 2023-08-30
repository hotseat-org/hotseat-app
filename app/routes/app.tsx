import { type LoaderArgs } from '@vercel/remix'
import { Header } from '~/components/Navbar'

import { requireUser } from '~/services/session.server'

import { Outlet } from '@remix-run/react'

export const loader = async ({ request }: LoaderArgs) => {
  await requireUser(request)

  return null
}

export default function Index() {
  return (
    <>
      <Header />
      <Outlet />
    </>
  )
}
