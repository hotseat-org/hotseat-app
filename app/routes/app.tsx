import { Outlet, useSearchParams } from "react-router"
import { Toast } from "@heroui/react"
import { lazy, Suspense } from "react"
import { Route } from "./+types/app"
import NewOrganization from "./api.new-organization"
import { useIsSelfHosted } from "~/edition/edition"
import { useSettings } from "~/components/settings/useSettings"
import { requireUser } from "~/services/session.server"
import { loadUserSettings } from "~/utils/loader-helpers/settings.server"
import { BOOKING_ACTIONS, NOTIFICATION_ACTIONS, revalidateOn } from "~/utils/revalidation"

export const loader = async ({ request }: Route.LoaderArgs) => {
  const user = await requireUser(request)
  // User settings (?settings=user/…) can open over any app page: load the open
  // panel's data here so it's server-rendered with the page.
  return { userSettings: await loadUserSettings(request, user) }
}

export const shouldRevalidate = revalidateOn({
  settings: "user",
  unaffectedBy: [BOOKING_ACTIONS, NOTIFICATION_ACTIONS],
})

// The settings dialog's code (~170 KB) loads only when settings are opened.
const SettingsOverlay = lazy(() =>
  import("~/components/settings/SettingsOverlay").then((m) => ({ default: m.SettingsOverlay }))
)

export default function Index() {
  const [searchParams] = useSearchParams()
  const modal = searchParams.get("modal")
  const { scope } = useSettings()
  const isSelfHosted = useIsSelfHosted()

  return (
    <main className="flex h-full bg-background">
      {/* Top: the bottom holds the day toolbar (desktop) and the dock + tabs (phone). */}
      <Toast.Provider placement="top" />
      <Outlet />
      {modal === "new-organization" && !isSelfHosted && <NewOrganization />}
      {(scope === "user" || scope === "org") && (
        <Suspense fallback={null}>
          <SettingsOverlay />
        </Suspense>
      )}
    </main>
  )
}
