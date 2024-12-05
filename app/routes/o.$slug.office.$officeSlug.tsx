import { Tab, Tabs } from "@nextui-org/react"
import { Outlet, useLoaderData, useLocation, useNavigate, LoaderFunctionArgs } from "react-router"
import { Cog, Eye } from "lucide-react"
import { useMemo } from "react"
import { z } from "zod"
import { Container } from "~/components/Container"
import { getCore } from "~/core/get-core"
import { requireProfile } from "~/utils/loader-helpers/requireProfile"

const keys = ["view", "settings"]

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

  const location = useLocation()
  const navigate = useNavigate()

  const key = useMemo(
    () => keys.find((key) => location.pathname.includes(key)),
    [location.pathname]
  )

  return (
    <Container>
      <div className="flex gap-12">
        <h1 className="text-4xl font-extrabold">{name}</h1>
        <Tabs
          variant="bordered"
          selectedKey={key}
          color={key === "danger" ? "danger" : "default"}
          onSelectionChange={(value) => navigate(value.toString())}
        >
          <Tab
            key="view"
            title={
              <div className="flex items-center space-x-2">
                <Eye />
                <span>View</span>
              </div>
            }
          />
          <Tab
            key="settings"
            title={
              <div className="flex items-center space-x-2">
                <Cog />
                <span>Settings</span>
              </div>
            }
          />
        </Tabs>
      </div>
      <Outlet />
    </Container>
  )
}

export default Office
