import { Divider, Tab, Tabs } from "@nextui-org/react"
import { Role } from "@prisma/client"
import { Outlet, useLocation, useNavigate } from "@remix-run/react"
import type { LoaderFunctionArgs } from "@vercel/remix"
import clsx from "clsx"
import { Cog, Mails, Skull, Users } from "lucide-react"
import { useMemo } from "react"
import { Container } from "~/components/Container"
import { requireProfile } from "~/utils/loader-helpers/requireProfile"

const keys = ["general", "invitations", "members", "danger"]

export const loader = async (args: LoaderFunctionArgs) => {
  await requireProfile(args, { requiredRole: Role.ADMIN })
  return null
}

const Settings = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const key = useMemo(
    () => keys.find((key) => location.pathname.includes(key)),
    [location.pathname]
  )

  return (
    <Container>
      <div className="flex gap-2 items-center">
        <h1
          className={clsx(
            "text-3xl",
            "font-extrabold text-transparent",
            "bg-clip-text bg-gradient-to-r",
            "from-blue-700 to-red-400"
          )}
        >
          Organization settings
        </h1>
      </div>

      <Tabs
        variant="bordered"
        selectedKey={key}
        color={key === "danger" ? "danger" : "default"}
        onSelectionChange={(value) => navigate(value.toString())}
      >
        <Tab
          key="general"
          title={
            <div className="flex items-center space-x-2">
              <Cog />
              <span>General</span>
            </div>
          }
        >
          <Divider className="mb-14" />
          <Outlet />
        </Tab>
        <Tab
          key="invitations"
          title={
            <div className="flex items-center space-x-2">
              <Mails />
              <span>Invitations</span>
            </div>
          }
        >
          <Divider className="mb-12" />
          <Outlet />
        </Tab>
        <Tab
          key="members"
          title={
            <div className="flex items-center space-x-2">
              <Users />
              <span>Members</span>
            </div>
          }
        >
          <Divider className="mb-12" />
          <Outlet />
        </Tab>
        <Tab
          key="danger"
          title={
            <div className="flex items-center space-x-2">
              <Skull />
              <span>Danger zone</span>
            </div>
          }
        >
          <Divider className="mb-12" />
          <Outlet />
        </Tab>
      </Tabs>
    </Container>
  )
}

export default Settings
