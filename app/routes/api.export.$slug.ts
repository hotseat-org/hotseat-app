import type { LoaderFunctionArgs } from "react-router"
import { getCore } from "~/core/get-core"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"
import { requireProfile } from "~/utils/loader-helpers/requireProfile"

/**
 * The organization, whole, as a file to download (admins): what its own
 * Hotseat starts from (see core/transfer). Named by it and the day:
 * hotseat-acme-2026-11-09.json.gz.
 */
export const loader = async (args: LoaderFunctionArgs) => {
  const profile = await requireProfile(args, { requiredRole: Role.ADMIN })
  const slug = profile.organizationSlug

  const file = await getCore().transfer.export(slug)
  if (!file) throw new Response(null, { status: 404 })

  const day = new Date().toISOString().slice(0, 10)

  return new Response(file, {
    headers: {
      "Content-Type": "application/gzip",
      "Content-Disposition": `attachment; filename="hotseat-${slug}-${day}.json.gz"`,
      "Cache-Control": "no-store",
    },
  })
}
