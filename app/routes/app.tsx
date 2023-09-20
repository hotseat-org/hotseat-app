import { type LoaderFunctionArgs } from '@vercel/remix'

import { requireUser } from '~/services/session.server'

import { Image } from '@nextui-org/react'
import { Outlet } from '@remix-run/react'
import { Header } from '~/components/Navbar'

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await requireUser(request)

  return null
}

const Backdrop = () => (
  <Image
    alt="abstract gradient backdrop"
    src="/images/bg-gradient.png"
    className="relative z-10 opacity-0 shadow-black/5 data-[loaded=true]:opacity-100 shadow-none transition-transform-opacity motion-reduce:transition-none !duration-300 rounded-large"
  />
)

export default function Index() {
  return (
    <div className="relative">
      <Header />
      <main className="z-10 relative">
        <Outlet />
      </main>
      <div
        aria-hidden
        className="fixed hidden dark:md:block dark:opacity-70 -bottom-[40%] -left-[20%] z-0 blur-2xl"
      >
        <Backdrop />
      </div>
      <div
        aria-hidden
        className="fixed hidden dark:md:block dark:opacity-70 -bottom-[0%] -right-[20%] z-0 blur-2xl"
      >
        <Backdrop />
      </div>
    </div>
  )
}
