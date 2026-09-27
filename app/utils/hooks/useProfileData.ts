import { useRouteLoaderData } from "react-router"
import type { loader as organizationLoader } from "../../routes/app.o.$slug"

export const useOrganizationContext = () => {
  const data = useRouteLoaderData<typeof organizationLoader>("routes/app.o.$slug")

  if (!data) {
    throw new Error("You should return profile and organization from loader at routes/o.$slug")
  }

  return data
}
