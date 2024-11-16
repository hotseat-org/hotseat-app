import { useLoaderData } from "@remix-run/react"
import { LoaderFunctionArgs } from "@remix-run/server-runtime"
import { z } from "zod"
import { getCore } from "~/core/get-core"
import { requireProfile } from "~/utils/loader-helpers/requireProfile"

export const loader = async (args: LoaderFunctionArgs) => {
  const profile = await requireProfile(args)
  const slug = z.string().parse(args.params.officeSlug)
  const core = getCore()

  const office = await core.office.get({
    slug,
    organizationSlug: profile.organizationSlug,
  })

  return office
}

const Office = () => {
  const { name } = useLoaderData<typeof loader>()

  return <h2>{name}</h2>
}

export default Office
