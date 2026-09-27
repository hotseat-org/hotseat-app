import { type LoaderFunctionArgs } from "react-router"
import { getCore } from "~/core/get-core"
import type { MyBookings } from "~/core/reservation/mine"
import { requireProfile } from "~/utils/loader-helpers/requireProfile"

export type MyBookingsData = MyBookings | { error: string }

/** Your upcoming bookings across the organization's offices (for the My bookings panel). */
export const loader = async (args: LoaderFunctionArgs): Promise<MyBookingsData> => {
  const profile = await requireProfile(args)
  try {
    return await getCore().reservation.mine({
      organizationSlug: profile.organizationSlug,
      userEmail: profile.userEmail,
    })
  } catch (error) {
    console.error("Loading my bookings failed", error)
    return { error: "Couldn't load your bookings." }
  }
}

// A loader-only route is a resource route; give it a component so a thrown
// response renders the error boundary instead of being sent raw.
export default function MyBookingsRoute() {
  return null
}
