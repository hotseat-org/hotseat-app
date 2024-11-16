import { useRouteLoaderData } from "@remix-run/react"
import { Profile } from "~/core/profile/types"
import type { User } from "~/core/user/types"

export function useUser(): User {
  const data = useRouteLoaderData<{ user: User }>("root")

  if (data?.user) {
    return data.user
  }

  throw new Error("User must be logged in")
}

export function useProfile(): Profile {
  const data = useRouteLoaderData<{ profile: Profile }>("routes/o.$slug")

  if (data?.profile) {
    return data.profile
  }

  throw new Error("User must have a profile in this organization")
}
