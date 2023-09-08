import { Tab, Tabs } from '@nextui-org/react'
import { Outlet, useLocation, useNavigate } from '@remix-run/react'
import clsx from 'clsx'
import { Cog, PersonStanding } from 'lucide-react'
import { useMemo } from 'react'
import { Container } from '~/components/Container'

const keys = ['general', 'members']

const Organization = () => {
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
            'text-3xl',
            'font-extrabold text-transparent',
            'bg-clip-text bg-gradient-to-r',
            'from-blue-700 to-red-400'
          )}
        >
          Organization settings
        </h1>
      </div>

      <Tabs
        variant="bordered"
        selectedKey={key}
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
          <Outlet />
        </Tab>
        <Tab
          key="members"
          title={
            <div className="flex items-center space-x-2">
              <PersonStanding />
              <span>Members</span>
            </div>
          }
        >
          <Outlet />
        </Tab>
      </Tabs>
    </Container>
  )
}

export default Organization
