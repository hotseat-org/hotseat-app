import { Outlet } from "react-router"
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
