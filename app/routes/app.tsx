import { Outlet, useSearchParams } from "react-router"
import { Toast } from "@heroui/react"
import { Route } from "./+types/app"
import NewOrganization from "./api.new-organization"
import { SettingsOverlay } from "~/components/settings/SettingsOverlay"
import { requireUser } from "~/services/session.server"
import { loadUserSettings } from "~/utils/loader-helpers/settings.server"
import { revalidateOn } from "~/utils/revalidation"

export const loader = async ({ request }: Route.LoaderArgs) => {
  const user = await requireUser(request)
  // User settings (?settings=user/…) can open over any app page: load the open
  // panel's data here so it's server-rendered with the page.
  return { userSettings: await loadUserSettings(request, user) }
}

export const shouldRevalidate = revalidateOn({ settings: "user" })

export default function Index() {
  const [searchParams] = useSearchParams()
  const modal = searchParams.get("modal")

  return (
    <main className="flex h-full bg-background">
      <Toast.Provider />
      <Outlet />
      {modal === "new-organization" && <NewOrganization />}
      <SettingsOverlay />
    </main>
  )
}
