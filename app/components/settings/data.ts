import { useRouteLoaderData } from "react-router"
import type { loader as appLoader } from "~/routes/app"
import type { loader as orgLoader } from "~/routes/app.o.$slug"

/**
 * The open settings panel's data, loaded on the server by the layout that owns
 * the scope (see ~/utils/loader-helpers/settings.server). While another panel's
 * data is still showing (switching sections) the section won't match — treat
 * that as loading.
 */
export const useUserSettingsData = <S extends string>(section: S) => {
  const data = useRouteLoaderData<typeof appLoader>("routes/app")?.userSettings
  return data?.section === section ? data : undefined
}

export const useOrgSettingsData = <S extends string>(section: S) => {
  const data = useRouteLoaderData<typeof orgLoader>("routes/app.o.$slug")?.orgSettings
  return data?.section === section ? data : undefined
}
