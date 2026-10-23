import { redirect, type LoaderFunctionArgs } from "react-router"
import type { Route } from "./+types/app.o.$slug.offices.$officeSlug.settings.($section)"
import { OfficeSettings } from "~/components/settings/SettingsOverlay"
import { requireProfile } from "~/utils/loader-helpers/requireProfile"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"
import { revalidateOn } from "~/utils/revalidation"

const SECTIONS = ["general", "danger"]

/**
 * Office settings, as a modal over the office (the parent route renders the
 * scene and this in its outlet). Its data is the office's own loader data, so
 * a direct visit renders scene chrome + modal + panel in one server response.
 */
export const loader = async (args: LoaderFunctionArgs) => {
  const profile = await requireProfile(args)
  const { slug, officeSlug, section } = args.params
  // An admin's page: anyone else lands back on the office.
  if (profile.role !== Role.ADMIN) throw redirect(`/app/o/${slug}/offices/${officeSlug}`)
  if (section && !SECTIONS.includes(section))
    throw redirect(`/app/o/${slug}/offices/${officeSlug}/settings/general`)
  return null
}

export const shouldRevalidate = revalidateOn({ params: ["slug", "officeSlug", "section"] })

export default function OfficeSettingsRoute({ params }: Route.ComponentProps) {
  return <OfficeSettings section={params.section ?? "general"} />
}
