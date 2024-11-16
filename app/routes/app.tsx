import { Outlet } from "@remix-run/react"
import { Header } from "~/components/Navbar"

export default function Index() {
  return (
    <div>
      <main>
        <Header />
        <Outlet />
      </main>
    </div>
  )
}
