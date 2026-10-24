import { type LoaderFunctionArgs } from "react-router"
import { z } from "zod"
import { getCore } from "~/core/get-core"
import type { OfficeInsights } from "~/core/office/insights"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"
import { requireProfile } from "~/utils/loader-helpers/requireProfile"
import { getTranslator } from "~/i18n/locale.server"

export type InsightsData = OfficeInsights | { error: string }

/** An office's occupancy insights (admins): `?period=4w|12w|next`. */
export const loader = async (args: LoaderFunctionArgs): Promise<InsightsData> => {
  const profile = await requireProfile(args, { requiredRole: Role.ADMIN })
  const officeSlug = z.string().parse(args.params.officeSlug)
  const period = z
    .enum(["4w", "12w", "next"])
    .catch("4w")
    .parse(new URL(args.request.url).searchParams.get("period"))
  try {
    return await getCore().office.insights({
      organizationSlug: profile.organizationSlug,
      officeSlug,
      userEmail: profile.userEmail,
      period,
    })
  } catch (error) {
    console.error("Loading insights failed", error)
    return { error: (await getTranslator(args.request)).t("Couldn't load the insights.") }
  }
}

// A loader-only route is a resource route; give it a component so a thrown
// response renders the error boundary instead of being sent raw.
export default function InsightsRoute() {
  return null
}
